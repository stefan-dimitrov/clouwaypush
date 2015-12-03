/**
 * @author Stefan Dimitrov (stefan.dimitrov@clouway.com).
 */

describe('PushApi', function () {

  beforeEach(module('clouway-push'));

  var pushApi, socket, rootScope, connectMethod, bindMethod, unbindMethod, keepAliveMethod, $interval, $timeout;
  var keepAliveInterval = 5; //in seconds
  var reconnectInterval = 20; //in seconds
  var subscriber = 'test-subscriber';
  var channelToken = 'fake-channel-token';
  beforeEach(function () {
    module(function (pushApiProvider) {
      connectMethod = jasmine.createSpy('connectMethod');
      bindMethod = jasmine.createSpy('bindMethod');
      unbindMethod = jasmine.createSpy('unbindMethod');
      keepAliveMethod = jasmine.createSpy('keepAliveMethod');

      pushApiProvider.openConnectionMethod(connectMethod)
        .bindMethod(bindMethod)
        .unbindMethod(unbindMethod)
        .keepAliveMethod(keepAliveMethod).keepAliveTimeInterval(keepAliveInterval)
        .reconnectTimeInterval(reconnectInterval);
    });

    inject(function ($rootScope, $q, _$interval_, _$timeout_, _pushApi_) {
      rootScope = $rootScope;
      $interval = _$interval_;
      $timeout = _$timeout_;
      pushApi = _pushApi_;
      var connectDeferred = $q.defer();

      //promise.connect = connectDeferred.promise;
      connectMethod.and.returnValue(connectDeferred.promise);

      pushApi.openConnection(subscriber);
      connectDeferred.resolve(channelToken);
      rootScope.$digest();
      socket = goog.appengine.Socket._get(channelToken);
    });
  });

  it('call bound event handler', function () {
    var eventName = 'fake-event';

    var callback = jasmine.createSpy('callback');
    pushApi.bind(eventName, callback);

    expect(bindMethod).toHaveBeenCalledWith(subscriber, eventName);

    socket.onmessage({data: angular.toJson({event: eventName})});

    expect(callback).toHaveBeenCalledWith({event: eventName});
  });

  it('call many bound event handlers', function () {
    var eventName = 'fake-event';

    var callback1 = jasmine.createSpy('callback1');
    var callback2 = jasmine.createSpy('callback2');
    var callback3 = jasmine.createSpy('callback3');
    pushApi.bind(eventName, callback1);
    pushApi.bind(eventName, callback2);
    pushApi.bind(eventName, callback3);

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
    var boundCallback1 = pushApi.bind(eventName, callback1);
    var boundCallback2 = pushApi.bind(eventName, callback2);
    var boundCallback3 = pushApi.bind(eventName, callback3);

    pushApi.unbind(eventName, boundCallback1);
    pushApi.unbind(eventName, boundCallback3);

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
    var boundCallback = pushApi.bind(eventName, callback);

    pushApi.unbind('non-existing-event', boundCallback);
    expect(unbindMethod).not.toHaveBeenCalled();

    var messageData = {event: eventName};
    socket.onmessage({data: angular.toJson(messageData)});

    expect(callback).toHaveBeenCalled();
  });

  it('not unbind handler not for event', function () {
    var eventName = 'fake-event';

    var callback1 = jasmine.createSpy('callback1');
    var callback2 = jasmine.createSpy('callback2');
    var boundCallback1 = pushApi.bind(eventName, callback1);
    var boundCallback2 = pushApi.bind('other-event', callback2);

    pushApi.unbind(eventName, boundCallback2);

    var messageData = {event: eventName};
    socket.onmessage({data: angular.toJson(messageData)});

    expect(callback1).toHaveBeenCalled();
  });

  it('unbind all handlers for event', function () {
    var eventName = 'fake-event';

    var callback1 = jasmine.createSpy('callback1');
    var callback2 = jasmine.createSpy('callback2');
    var callback3 = jasmine.createSpy('callback3');
    pushApi.bind(eventName, callback1);
    pushApi.bind(eventName, callback2);
    pushApi.bind(eventName, callback3);

    pushApi.unbind(eventName);

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

  it('attempt a reconnect after time interval', inject(function ($q) {
    connectMethod.calls.reset();

    var deferred = $q.defer();
    connectMethod.and.returnValue(deferred.promise);
    var dummySubscriber = 'dummy_subscriber';
    pushApi.openConnection(dummySubscriber);

    expect(connectMethod.calls.count()).toBe(1);

    deferred.reject();
    rootScope.$digest();

    expect(connectMethod.calls.count()).toBe(1);
    $timeout.flush(reconnectInterval * 1000);
    expect(connectMethod.calls.count()).toBe(2);
    expect(connectMethod.calls.mostRecent().args).toEqual([dummySubscriber]);
  }));

  it('generate a subscriber if it is not specified', function () {
    connectMethod.calls.reset();

    spyOn(Math, 'random').and.returnValue(0.07);
    connectMethod.and.returnValue({then: angular.noop});

    var generatedSubscriber = pushApi.openConnection();

    expect(generatedSubscriber).toEqual('eeeeeeeeeeeeeee');
    expect(connectMethod).toHaveBeenCalledWith(generatedSubscriber);
  });

});