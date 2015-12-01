/**
 * @author Stefan Dimitrov (stefan.dimitrov@clouway.com).
 */

describe('ChannelApi should', function () {

  var channelApi, socket, rootScope, bindMethod, unbindMethod, keepAliveMethod, $interval;
  var keepAliveInterval = 5; //in seconds
  var promise = {connect: {}};
  var subscriber = 'test-subscriber';
  var channelToken = 'fake-channel-token';
  beforeEach(function () {
    module('common.pushapi', function (channelApiProvider) {
      bindMethod = jasmine.createSpy('bindMethod');
      unbindMethod = jasmine.createSpy('unbindMethod');
      keepAliveMethod = jasmine.createSpy('keepAliveMethod');

      channelApiProvider.openConnectionMethod(function (subscriber) {
          return promise.connect;
        })
        .bindMethod(bindMethod)
        .unbindMethod(unbindMethod)
        .keepAliveMethod(keepAliveMethod).keepAliveTimeInterval(keepAliveInterval);
    });

    inject(function ($rootScope, $q, _$interval_, _channelApi_) {
      rootScope = $rootScope;
      $interval = _$interval_;
      channelApi = _channelApi_;
      var connectDeferred = $q.defer();

      promise.connect = connectDeferred.promise;

      channelApi.openConnection(subscriber);
      connectDeferred.resolve(channelToken);
      rootScope.$digest();
      socket = goog.appengine.Socket._get(channelToken);
    });
  });

  it('call bound event handler', function () {
    var eventName = 'fake-event';

    var callback = jasmine.createSpy('callback');
    channelApi.bind(eventName, callback);

    expect(bindMethod).toHaveBeenCalledWith(subscriber, eventName);

    socket.onmessage({data: angular.toJson({event: eventName})});

    expect(callback).toHaveBeenCalledWith({event: eventName});
  });

  it('call many bound event handlers', function () {
    var eventName = 'fake-event';

    var callback1 = jasmine.createSpy('callback1');
    var callback2 = jasmine.createSpy('callback2');
    var callback3 = jasmine.createSpy('callback3');
    channelApi.bind(eventName, callback1);
    channelApi.bind(eventName, callback2);
    channelApi.bind(eventName, callback3);

    expect(bindMethod.calls.count()).toEqual(3);
    expect(bindMethod.calls.argsFor(0)).toEqual([subscriber, eventName]);
    expect(bindMethod.calls.argsFor(1)).toEqual([subscriber, eventName]);
    expect(bindMethod.calls.argsFor(2)).toEqual([subscriber, eventName]);

    var messageData = {event: eventName};
    socket.onmessage({data: angular.toJson(messageData)});

    expect(callback1).toHaveBeenCalledWith(messageData);
    expect(callback2).toHaveBeenCalledWith(messageData);
    expect(callback3).toHaveBeenCalledWith(messageData);
  });

  it('not call non-bound event handlers', function () {
    var eventName = 'fake-event';

    var callback1 = jasmine.createSpy('callback1');
    var callback2 = jasmine.createSpy('callback2');
    var callback3 = jasmine.createSpy('callback3');
    var boundCallback1 = channelApi.bind(eventName, callback1);
    var boundCallback2 = channelApi.bind(eventName, callback2);
    var boundCallback3 = channelApi.bind(eventName, callback3);

    channelApi.unbind(eventName, boundCallback1);
    channelApi.unbind(eventName, boundCallback3);

    expect(unbindMethod.calls.count()).toEqual(2);
    expect(unbindMethod.calls.argsFor(0)).toEqual([subscriber, eventName]);
    expect(unbindMethod.calls.argsFor(1)).toEqual([subscriber, eventName]);

    var messageData = {event: eventName};
    socket.onmessage({data: angular.toJson(messageData)});

    expect(callback1).not.toHaveBeenCalled();
    expect(callback2).toHaveBeenCalledWith(messageData);
    expect(callback3).not.toHaveBeenCalled();
  });

  it('not unbind handler for non-existing event', function () {
    var eventName = 'fake-event';

    var callback = jasmine.createSpy('callback');
    var boundCallback = channelApi.bind(eventName, callback);

    channelApi.unbind('non-existing-event', boundCallback);
    expect(unbindMethod).not.toHaveBeenCalled();

    var messageData = {event: eventName};
    socket.onmessage({data: angular.toJson(messageData)});

    expect(callback).toHaveBeenCalled();
  });

  it('not unbind handler not for event', function () {
    var eventName = 'fake-event';

    var callback1 = jasmine.createSpy('callback1');
    var callback2 = jasmine.createSpy('callback2');
    var boundCallback1 = channelApi.bind(eventName, callback1);
    var boundCallback2 = channelApi.bind('other-event', callback2);

    channelApi.unbind(eventName, boundCallback2);

    var messageData = {event: eventName};
    socket.onmessage({data: angular.toJson(messageData)});

    expect(callback1).toHaveBeenCalled();
  });

  it('unbind all handlers for event', function () {
    var eventName = 'fake-event';

    var callback1 = jasmine.createSpy('callback1');
    var callback2 = jasmine.createSpy('callback2');
    var callback3 = jasmine.createSpy('callback3');
    channelApi.bind(eventName, callback1);
    channelApi.bind(eventName, callback2);
    channelApi.bind(eventName, callback3);

    channelApi.unbind(eventName);

    var messageData = {event: eventName};
    socket.onmessage({data: angular.toJson(messageData)});

    expect(callback1).not.toHaveBeenCalled();
    expect(callback2).not.toHaveBeenCalled();
    expect(callback3).not.toHaveBeenCalled();
  });

  it('call keepAlive after time interval', function () {
    expect(keepAliveMethod).not.toHaveBeenCalled();
    $interval.flush(keepAliveInterval * 1000);
    expect(keepAliveMethod).toHaveBeenCalledWith(subscriber);
  });

});