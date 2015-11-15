package com.clouway.push.server;

import com.clouway.push.shared.PushEvent;

/**
 * Used to serialize given {@link PushEvent} to string.
 *
 * @author Georgi Georgiev (GeorgievJon@gmail.com)
 */
interface Encoder {

  /**
   * Encodes the provided event as String value.
   *
   * @param event the event that needs to be encoded
   * @return the encoded value of event
   */
  String encode(PushEvent event);

}
