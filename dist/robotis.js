//
// Node.js client utilities for Edbot Studio.
//
// Copyright (c) Robots in Schools Ltd. All rights reserved.
//

class Robotis {
	//
	// IR sensor IRSS-10. Convert raw value to cm.
	//
	// Calibration: A white A4 card was held a known distance from the sensor and
	// the raw sensor value was noted. This was repeated for different distances.
	// The following function was derived by fitting a curve to the set of data
	// points.
	//
	// The measuring range is approx 3cm to 30cm.
	//
	// Return the distance in cm rounded to 1 decimal place.
	//
	static rawToIRSS10Dist(raw) {
		if(raw < 26 || raw > 713) {
			throw new RangeError("Raw value " + raw + " is outside the permitted range [26 - 713]");
		} else {
			return this.#round(214.32803656545 * Math.pow(raw, -0.60223538294025299184), 1);
		}
	}

	//
	// IR sensor DMS-80. Convert raw value to cm.
	//
	// Calibration: A white A4 card was held a known distance from the sensor and
	// the raw sensor value was noted. This was repeated for different distances.
	// The following function was derived by fitting a curve to the set of data
	// points.
	//
	// The measuring range is 8cm to 80cm.
	//
	// Return the distance in cm rounded to 1 decimal place.
	//
	static rawToDMS80Dist(raw) {
		if(raw < 111 || raw > 740) {
			throw new RangeError("Raw value " + raw + " is outside the permitted range [111 - 740]");
		} else {
			return this.#round(19490.373230416 * Math.pow(raw, -1.16498805911575493846), 1);
		}
	}

	//
	// Temperature sensor TPS-10. Convert raw value to degrees Celsius rounded to 1
	// decimal place.
	//
	static rawToTPS10Temp(raw) {
		return this.#round(0.1179268 * raw - 34.86361, 1);
	}

	//
	// Touch sensor TS-10.
	//
	// The touch sensor is a micro-switch. Return 1 if the switch is depressed,
	// otherwise 0.
	//
	static rawToTS10Touch(raw) {
		if(raw > 0) {
			return 1;
		} else {
			return 0;
		}
	}

	//
	// Magnetic sensor MGSS-10.
	//
	// The magnetic sensor is a reed switch which detects the presence of a magnet.
	// This function returns 1 when a magnet is present, otherwise 0.
	//
	static rawToMGSS10Mag(raw) {
		if(raw > 0) {
			return 1;
		} else {
			return 0;
		}
	}

	//
	// Servo motor SM-10.
	//
	// Return the angle of the servo from 0 to 300 degrees rounded to 1 decimal
	// place.
	//
	// Note the raw range of the SM-10 is 64 -> 959 and not 0 -> 1023.
	//
	static rawToSM10Angle(raw) {
		if(raw < 64 || raw > 959) {
			throw new RangeError("Raw value " + raw + " is outside the permitted range [64 - 959]");
		} else {
			return this.#round(300.0 * (raw - 64) / 895.0, 1);
		}
	}

	//
	// Internal IR sensor in the CM-150 Dream micro-controller. Convert raw value
	// to cm.
	//
	// Calibration: A white A4 card was held a known distance from the sensor and
	// the raw sensor value was noted. This was repeated for different distances.
	// The following function was derived by fitting a curve to the set of data
	// points.
	//
	// The measuring range is 3cm to 20cm.
	//
	// Return the distance in cm rounded to 1 decimal place.
	//
	static rawToCM150Dist(raw) {
		if(raw < 26 || raw > 681) {
			throw new RangeError("Raw value " + raw + " is outside the permitted range [26 - 681]");
		} else {
			return this.#round(108.47751089561 * Math.pow(raw, -0.51378200718609424542), 1);
		}
	}

	//
	// Internal IR sensor in the CM-50 Play micro-controller. Convert raw value
	// to cm.
	//
	// Calibration: A white A4 card was held a known distance from the sensor and
	// the raw sensor value was noted. This was repeated for different distances.
	// The following function was derived by fitting a curve to the set of data
	// points.
	//
	// The measuring range is 3cm to 20cm.
	//
	// Return the distance in cm rounded to 1 decimal place.
	//
	static rawToCM50Dist(raw) {
		if(raw < 26 || raw > 681) {
			throw new RangeError("Raw value " + raw + " is outside the permitted range [26 - 681]");
		} else {
			return this.#round(108.47751089561 * Math.pow(raw, -0.51378200718609424542), 1);
		}
	}

	///////////////////////////////////////////////////////////////////////////

	static #round(number, prec) {
		var factor = Math.pow(10, prec);
		var temp = Math.round(number * factor);
		return temp / factor;
	}
}

module.exports = Robotis;