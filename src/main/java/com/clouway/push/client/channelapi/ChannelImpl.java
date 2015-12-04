package com.clouway.push.client.channelapi;

import com.clouway.push.client.CurrentSubscriber;
import com.google.inject.Inject;
import com.google.inject.Provider;

/**
 * @author Ivan Lazov <ivan.lazov@clouway.com>
 */
public class ChannelImpl implements Channel {

  private Provider<String> subscriber;

  @Inject
  public ChannelImpl(@CurrentSubscriber Provider<String> subscriber) {
    this.subscriber = subscriber;
  }

  @Override
  public void open(String channelToken, ChannelListener listener) {

    openChannel(channelToken, listener);
    notifyForOpenedConnection(subscriber.get());
  }

  private native void openChannel(String channelToken, ChannelListener listener) /*-{

      var channel = new $wnd.goog.appengine.Channel(channelToken);
      var socket = channel.open();

      socket.onmessage = function (event) {
          listener.@com.clouway.push.client.channelapi.ChannelListener::onMessage(Ljava/lang/String;)(event.data);
      }

      socket.onerror = function (event) {
          listener.@com.clouway.push.client.channelapi.ChannelListener::onTokenExpire()();
      }
  }-*/;

  private native void notifyForOpenedConnection(String subscriber) /*-{
    if ($wnd.onChannelConnectionOpened) {
      $wnd.onChannelConnectionOpened(subscriber);
    }
  }-*/;
}
