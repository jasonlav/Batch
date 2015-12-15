(function () {
	'use strict';

	function Batch(config) {
		var defaultConfig = {
			elements: {},
			task: function (params, success, error, end) {
				setTimeout(function () {
					var random = Math.random();

					if (random > 0.75) {
						error("Random fail.", {});
					} else {
						success({});
					}
				}, 250);
			},
			die: function () {
			},
			end: function () {
			},
			cookieName: "batch_last_params",
			delayAttempts: 1000,
			maxBatches: 1,
			maxAttempts: 20,
			maxIterations: 10,
			allowMultiple: false,
			allowFail: false
		};
		this.batch = 0;
		this.reset();

		this.config = jQuery.extend(defaultConfig, config);

		this.init();
	}

	/**
	 * Init
	 */
	Batch.prototype.init = function () {
		if (this.config.elements.status) {
			this.config.elements.status.html("Awaiting start.");
		}

		if (this.config.elements.console) {
			this.config.elements.console.html("Last batch parameters:\n" + $.cookie(this.config.cookieName));
		}
	};

	/**
	 * Start
	 */
	Batch.prototype.start = function (params) {
		if (this.running) {
			this.status("error", "Batch already running.");
			return;
		}

		if (this.batch >= this.config.maxBatches) {
			this.status("error", "Maximum batches exceeded.");
			return;
		}

		this.batch += 1;
		this.task(params);
	};

	/**
	 * Start last
	 */
	Batch.prototype.startLast = function () {
		var params = $.cookie(this.config.cookieName);

		if (params) {
			params = JSON.parse(params);

			this.task(params);
		} else {
			this.status("error", "Parameters from last batch not found.");
		}
	};

	/**
	 * Stop
	 */
	Batch.prototype.stop = function () {
		this.halt = true;

		this.status(false, "Graceful batch stop requested.");
	};

	/**
	 * Task
	 */
	Batch.prototype.task = function (params) {
		var that = this;

		this.time = new Date().getTime();

		if (this.halt) {
			this.end();
			return;
		}

		if (typeof params !== "object") {
			this.error("Params must be an object", params);
		}

		this.running = true;
		this.params = params;

		$.cookie(this.config.cookieName, JSON.stringify(params), {expires: 365});

		this.config.task.apply(this, [params, function (params) {
			that.success(params);
		}, function (message, params) {
			that.error(message, params);
		}, function () {
			that.end();
		}]);
	};

	/**
	 * Success
	 */
	Batch.prototype.success = function (params) {
		var time = new Date().getTime();
		var seconds = (time - this.time) / 1000;

		this.status("success", "Task %i complete (" + seconds + "s)");

		if (this.config.maxIterations !== false && (this.iteration+1) >= this.config.maxIterations) {
			this.end();

			return;
		}

		this.iteration += 1;
		this.attempts = 0;
		this.completed += 1;

		this.task(params);
	};

	/**
	 * Error
	 */
	Batch.prototype.error = function (message, params) {
		var that = this;

		this.attempts += 1;

		this.status("error", "Task %i failed. " + message);

		if (this.attempts < this.config.maxAttempts) {
			setTimeout(function () {
				that.task(that.params);
			}, this.config.delayAttempts);
		} else {
			this.failed += 1;

			if (this.config.allowFail) {
				this.status("error", "Task %i failed after " + this.attempts + " attempts. Skipped.");

				this.iteration += 1;

				this.attempts = 0;
				this.task(params);
			} else {
				this.status("error", "Task %i failed after " + this.attempts + " attempts. Stopped.");

				this.die();
			}
		}
	};

	/**
	 * Die
	 */
	Batch.prototype.die = function () {
		this.console(this.params);
		this.config.die.apply(this, [this.params]);

		this.running = false;
	};

	/**
	 * End
	 */
	Batch.prototype.end = function () {
		if (this.failed) {
			this.status("error", "%i Tasks complete with " + this.failed + " errors");
		} else {
			this.status("success", "%i Tasks complete");
		}

		this.config.end.apply(this, [this.params]);
		this.running = false;
	};

	/**
	 * Reset
	 */
	Batch.prototype.reset = function () {
		this.iteration = 0;
		this.completed = 0;
		this.attempts = 0;
		this.failed = 0;
		this.running = false;
		this.params = {};
		this.halt = false;
	};

	/**
	 * Console
	 */
	Batch.prototype.console = function (params) {
		if (this.config.elements.console) {
			this.config.elements.console.html(JSON.stringify(params));
		}
	};

	/**
	 * Status
	 */
	Batch.prototype.status = function (type, message) {
		message = message.replace("%i", (this.iteration + 1));

		if (this.config.elements.status) {
			this.config.elements.status.html(message);

			if (type === "success") {
				this.config.elements.status.addClass("text-success").removeClass("text-danger");
			} else if (type === "error") {
				this.config.elements.status.removeClass("text-success").addClass("text-danger");
			} else {
				this.config.elements.status.removeClass("text-success").removeClass("text-danger");
			}
		}

		if (this.config.elements.log) {
			var element = jQuery("<li>").html(message);

			if (type === "success") {
				element.addClass("text-success");
			} else if (type === "error") {
				element.addClass("text-danger");
			}

			this.config.elements.log.prepend(element);
		}
	};

	window.Batch = Batch;
})();