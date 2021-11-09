//
// A Node.js client API for Edbot Studio.
//
// Copyright (c) Robots in Schools Ltd. All rights reserved.
//

const WebSocket = require("isomorphic-ws");
const merge = require("lodash.merge");
const unset = require("lodash.unset");

class EdbotStudioClient {
	static Category = {
		REQUEST: 1,
		RESPONSE: 2,
		UPDATE: 3,
		DELETE: 4,
		CLOSE: 5
	};
	static Type = {
		INIT: 1,
		GET_CLIENTS: 2,
		GET_SERVERS: 3,
		GET_SENSORS: 4,
		RUN_MOTION: 5,
		SET_SERVOS: 6,
		SET_SPEAKER: 7,
		SET_DISPLAY: 8,
		SET_OPTIONS: 9,
		SET_CUSTOM: 10,
		SAY: 11, 
		RESET: 12
	};

	constructor({server="localhost", port=54255, listener=null,
			name=null, reporters=true, deviceAlias=null} = {}) {
		this.server = server;
		this.port = port;
		this.listener = listener;
		this.name = name;
		this.reporters = reporters;
		this.deviceAlias = deviceAlias;
		this.connected = false;
		this.sequence = 1;
		this.pending = new Map();
	}

	connect() {
		if(this.connected) {
			return Promise.resolve();				// silently return
		}
		const url = `ws://${this.server}:${this.port}/api`;
		const self = this;
		return new Promise((resolve, reject) => {
			self.ws = new WebSocket(url);
			self.ws.onopen = function() {
				self.data = {};
				self.#send(
					EdbotStudioClient.Type.INIT, {
						name: self.name,
						reporters: self.reporters,
						deviceAlias: self.deviceAlias
					}, resolve, reject
				);
			}
			self.ws.onmessage = function(e) {
				const message = JSON.parse(e.data);
				if(message.category === EdbotStudioClient.Category.RESPONSE) {
					// Run code specific to the response message type.
					switch(message.type) {
						case EdbotStudioClient.Type.INIT:
							merge(self.data, message.data);
							self.connected = true;
							break;
					}
					if(self.listener) {
						self.listener(message);
					}

					// If present, resolve the promise linked to this sequence.
					if(self.pending.has(message.sequence)) {
						const action = self.pending.get(message.sequence);
						self.pending.delete(message.sequence);
						if(message.status.success) {
							action.resolve(message.data);								
						} else {
							action.reject(message.status.text);
						}
					}
				} else if(message.category === EdbotStudioClient.Category.UPDATE) {
					if(self.connected) {
						merge(self.data, message.data);
						if(self.listener) {
							self.listener(message);
						}
					}
				} else if(message.category === EdbotStudioClient.Category.DELETE) {
					if(self.connected) {
						unset(self.data, message.data.path);
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
						category: EdbotStudioClient.Category.CLOSE,
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
			throw new Error("Not connected");
		}
		return this.data;
	}

	getRobotNames(model = null) {
		if(!this.connected) {
			throw new Error("Not connected");
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
			throw new Error("Not connected");
		}
		if(this.data.robots[name]) {
			return this.data.robots[name];
		} else {
			throw new Error(name + " is not configured");
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
		return this.#request(EdbotStudioClient.Type.GET_CLIENTS, null);
	}

	getServers() {
		return this.#request(EdbotStudioClient.Type.GET_SERVERS, null);
	}

	getSensors(params) {
		return this.#request(EdbotStudioClient.Type.GET_SENSORS, params);
	}

	runMotion(params) {
		return this.#request(EdbotStudioClient.Type.RUN_MOTION, params);
	}

	setServos(params) {
		return this.#request(EdbotStudioClient.Type.SET_SERVOS, params);
	}

	setSpeaker(params) {
		return this.#request(EdbotStudioClient.Type.SET_SPEAKER, params);
	}

	setDisplay(params) {
		return this.#request(EdbotStudioClient.Type.SET_DISPLAY, params);
	}

	setOptions(params) {
		return this.#request(EdbotStudioClient.Type.SET_OPTIONS, params);
	}

	setCustom(params) {
		return this.#request(EdbotStudioClient.Type.SET_CUSTOM, params);
	}

	say(params) {
		return this.#request(EdbotStudioClient.Type.SAY, params);
	}

	reset(params) {
		return this.#request(EdbotStudioClient.Type.RESET, params);
	}

	///////////////////////////////////////////////////////////////////////////

	#request(type, params) {
		if(!this.connected) {
			throw new Error("Not connected");
		}
		const self = this;
		return new Promise((resolve, reject) => {
			self.#send(type, params, resolve, reject);
		});
	}

	#send(type, params, resolve, reject) {
		this.ws.send(
			JSON.stringify({
				category: EdbotStudioClient.Category.REQUEST,
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