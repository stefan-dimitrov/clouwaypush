/**
 * @author Stefan Dimitrov (stefan.dimitrov@clouway.com).
 */

angular.module('common.pushapi', [])

  .provider('channelApi', function () {

    this.connectionMethods = {
      connect: function () {},
      bind: function () {},
      unbind: function () {},
      keepAlive: function () {}
    };

    this.timeIntervals = {
      keepAlive: 60
    };

    /**
     * Set a method to call for opening of connection.
     *
     * @param {function} method method that will be called for opening of connection.
     * The method must return a promise.
     * @returns {*}
     */
    this.openConnectionMethod = function (method) {
      this.connectionMethods.connect = method;
      return this;
    };

    this.bindMethod = function (method) {
      this.connectionMethods.bind = method;
      return this;
    };

    this.unbindMethod = function (method) {
      this.connectionMethods.unbind = method;
      return this;
    };

    this.keepAliveMethod = function (method) {
      this.connectionMethods.keepAlive = method;
      return this;
    };

    this.keepAliveTimeInterval = function (seconds) {
      this.timeIntervals.keepAlive = seconds;
      return this;
    };

    this.$get = function ($rootScope, $interval) {
      var connectionMethods = this.connectionMethods;
      var timeIntervals = this.timeIntervals;
      var boundEvents = {};
      var connectedSubscriber;
      var interval;

      /**
       * Open connection for the specified subscriber.
       *
       * @param {String} subscriber subscriber to open connection for.
       */
      var connect = function (subscriber) {
        connectionMethods.connect(subscriber).then(function (token) {
          connectedSubscriber = subscriber;
          openChannel(token, subscriber);
          interval = $interval(keepAlive, timeIntervals.keepAlive * 1000);
        });
      };

      /**
       * Open channel using specified channel token.
       *
       * @param {String} channelToken the token to use for opening channel.
       * @param {String} subscriber subscriber to use when reopening channel.
       */
      var openChannel = function (channelToken, subscriber) {
        var channel = new goog.appengine.Channel(channelToken);
        var socket = channel.open();

        socket.onmessage = function (message) {
          console.log('push message:', message);
          var eventData = angular.fromJson(message.data);
          var handlers = boundEvents[eventData.event];

          angular.forEach(handlers, function (handler) {
            handler(eventData);
          });
        };

        socket.onerror = function (errorMessage) {
          console.log('error message:', errorMessage);
          connect(subscriber);
        };
      };

      var subscribeForEvent = function (eventName) {
        connectionMethods.bind(connectedSubscriber, eventName);
      };

      var unsubscribeFromEvent = function (eventName) {
        connectionMethods.unbind(connectedSubscriber, eventName);
      };

      var keepAlive = function () {
        console.log('keeping alive');
        connectionMethods.keepAlive(connectedSubscriber);
      };

      return {
        openConnection: connect,

        /**
         * Bind handler to push event.
         *
         * @param {String} eventName name of the push event to which to bind the handler
         * @param {Function} handler handler to be called when the event occurs
         * @returns {Function} the bound handler
         */
        bind: function (eventName, handler) {
          if (angular.isUndefined(boundEvents[eventName])) {
            boundEvents[eventName] = [];
          }

          var eventHandler = function (data) {
            handler(data);
            $rootScope.$apply();
          };

          subscribeForEvent(eventName);
          boundEvents[eventName].push(eventHandler);

          return eventHandler;
        },

        /**
         * Unbind handler/handlers from push event.
         * If no handler is specified then unbind all bound handlers from the event.
         *
         * @param {String} eventName name of the event from which to unbind the handler/handlers
         * @param {Function} [handler] the handler to be unbound from the event. If not defined, unbind all handlers for the event.
         */
        unbind: function (eventName, handler) {
          if (!(eventName in boundEvents)) {
            return;
          }

          if (angular.isUndefined(handler)) {
            delete boundEvents[eventName];
            return;
          }

          var handlerIndex = boundEvents[eventName].indexOf(handler);
          if (handlerIndex < 0) {
            return;
          }

          unsubscribeFromEvent(eventName);
          boundEvents[eventName].splice(handlerIndex, 1);
        }
      };
    };
  })

;