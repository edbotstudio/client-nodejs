//
// A Node.js client API for Edbot Studio.
//
// Copyright (c) Robots in Schools Ltd. All rights reserved.
//

const WebSocket = require("isomorphic-ws");
const _ = require("lodash");

class EdbotStudioClient {
	static Message = {
		REQUEST: 1,
		RESPONSE: 2,
		UPDATE: 3,
		DELETE: 4,
		CLOSE: 5
	};
	static Request = {
		INIT: 1,
		GET_CLIENTS: 2,
		GET_SERVERS: 3,
		RUN_MOTION: 10,
		SET_SERVO_MODE: 11,
		SET_SERVO_TORQUE: 12,
		SET_SERVO_LED: 13,
		SET_SERVO_SPEED: 14,
		SET_SERVO_POSITION: 15,
		SET_SERVO_PID: 16,
		SET_BUZZER: 20,
		SET_OPTIONS: 21,
		SET_CUSTOM: 22,
		SAY: 23, 
		RESET: 24
	};
	static Filter = {
		ALL: 1,
		CFG: 2
	};

	constructor(server, port, user, listener = null,
			filter = EdbotStudioClient.Filter.ALL, deviceAlias = null) {
		this.server = server;
		this.port = port;
		this.user = user;
		this.listener = listener;
		this.filter = filter;
		this.deviceAlias = deviceAlias;
		this.connected = false;
		this.sequence = 1;
		this.pending = new Map();
	}

	connect() {
		if(this.connected) {
			return;					// silently return
		}
		const url = `ws://${this.server}:${this.port}/api`;
		const self = this;
		return new Promise((resolve, reject) => {
			self.ws = new WebSocket(url);
			self.ws.onopen = function() {
				self.data = {};
				self._send(
					EdbotStudioClient.Request.INIT, {
						user: self.user,
						filter: self.filter,
						deviceAlias: self.deviceAlias
					}, resolve, reject
				);
			}
			self.ws.onmessage = function(e) {
				const message = JSON.parse(e.data);
				if(message.sort === EdbotStudioClient.Message.RESPONSE) {
					// Run code specific to the response message type.
					switch(message.type) {
						case EdbotStudioClient.Request.INIT:
							_.merge(self.data, message.data);
							self.connected = true;
							break;
					}
					if(self.listener) {
						self.listener(message);
					}

					// Resolve the promise linked to this sequence.
					if(self.pending.has(message.sequence)) {
						const action = self.pending.get(message.sequence);
						self.pending.delete(message.sequence);
						if(message.status.success) {
							action.resolve(message.data);								
						} else {
							action.reject(message.status.text);
						}
					}
				} else if(message.sort === EdbotStudioClient.Message.UPDATE) {
					if(self.connected) {
						_.merge(self.data, message.data);
						if(self.listener) {
							self.listener(message);
						}
					}
				} else if(message.sort === EdbotStudioClient.Message.DELETE) {
					if(self.connected) {
						_.unset(self.data, message.data.path);
						if(self.listener) {
							self.listener(message);
						}
					}
				}
			};
			self.ws.onclose = function(e) {
				self.connected = false;
				if(self.data) {
					Object.keys(self.data).forEach(key => {
						delete self.data[key];
					});
				}
				if(self.listener) {
					self.listener({
						sort: EdbotStudioClient.Message.CLOSE,
						data: {
							code: e.code,
							reason: e.reason
						}
					});
				}
			};
			self.ws.onerror = function(e) {
				reject(e.message);
			};
		});
	}

	getConnected() {
		return this.connected;
	}

	//
	// If connected, this will close the connection and call the onclose
	// handler. If the connection is already closed, it does nothing.
	//
	disconnect() {
		this.ws.close(1000, "Closed by client");
	}

	getData() {
		if(!this.connected) {
			throw "Not connected";
		}
		return this.data;
	}

	getRobotNames(model = null) {
		if(!this.connected) {
			throw "Not connected";
		}
		if(model) {
			var robots = {};
			for(const name in this.data.robots) {
				const robot = this.data.robots[name];
				if(robot.model.type === model) {
					robots[robot.name] = robot;
				}
			}
			return Object.keys(robots);
		} else {
			return  Object.keys(this.data.robots);
		}
	}

	getRobot(name) {
		if(!this.connected) {
			throw "Not connected";
		}
		if(this.data.robots[name]) {
			return this.data.robots[name];
		} else {
			throw(name + " is not configured");
		}
	}

	haveControl(name) {
		const robot = this.getRobot(name);
		return robot.control === this.data.session.device.id;
	}

	awaitControl(name) {
		const robot = this.getRobot(name);
		const self = this;
		return new Promise(resolve => {
			(function waitForControl(){
				if(robot.control === self.data.session.device.id) {
					return resolve();
				}
				setTimeout(waitForControl, 100);
			})();
		});
	}

	getClients() {
		return this._request(EdbotStudioClient.Request.GET_CLIENTS, null);
	}

	getServers() {
		return this._request(EdbotStudioClient.Request.GET_SERVERS, null);
	}

	runMotion(params) {
		return this._request(EdbotStudioClient.Request.RUN_MOTION, params);
	}

	setServoMode(params) {
		return this._request(EdbotStudioClient.Request.SET_SERVO_MODE, params);
	}

	setServoTorque(params) {
		return this._request(EdbotStudioClient.Request.SET_SERVO_TORQUE, params);
	}

	setServoLED(params) {
		return this._request(EdbotStudioClient.Request.SET_SERVO_LED, params);
	}

	setServoSpeed(params) {
		return this._request(EdbotStudioClient.Request.SET_SERVO_SPEED, params);
	}

	setServoPosition(params) {
		return this._request(EdbotStudioClient.Request.SET_SERVO_POSITION, params);
	}

	setServoPID(params) {
		return this._request(EdbotStudioClient.Request.SET_SERVO_PID, params);
	}

	setBuzzer(params) {
		return this._request(EdbotStudioClient.Request.SET_BUZZER, params);
	}

	setOptions(params) {
		return this._request(EdbotStudioClient.Request.SET_OPTIONS, params);
	}

	setCustom(params) {
		return this._request(EdbotStudioClient.Request.SET_CUSTOM, params);
	}

	say(params) {
		return this._request(EdbotStudioClient.Request.SAY, params);
	}

	reset(params) {
		return this._request(EdbotStudioClient.Request.RESET, params);
	}

	///////////////////////////////////////////////////////////////////////////

	_request(type, params) {
		if(!this.connected) {
			throw "Not connected";
		}
		const self = this;
		return new Promise((resolve, reject) => {
			self._send(type, params, resolve, reject);
		});
	}

	_send(type, params, resolve, reject) {
		this.ws.send(
			JSON.stringify({
				sort: EdbotStudioClient.Message.REQUEST,
				type: type,
				sequence: this.sequence,
				params: params
			})
		);
		this.pending.set(this.sequence, { resolve: resolve, reject: reject });
		this.sequence++;
	}
}

module.exports = EdbotStudioClient;