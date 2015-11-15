package com.clouway.push.server;

import com.clouway.push.server.testevents.AddPersonEvent;
import com.clouway.push.server.testevents.RemovePersonEvent;
import org.junit.Test;

import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.is;
import static org.junit.Assert.*;


/**
 * @author Miroslav Genov (miroslav.genov@clouway.com)
 */
public class JsonEncoderTest {
  JsonEncoder encoder = new JsonEncoder();

  @Test
  public void happyPath() {
    String json = encoder.encode(new AddPersonEvent("John", 12));
    assertThat(json, is(equalTo("{\"name\":\"John\",\"age\":12,\"event\":\"addPersonEvent\"}")));
  }

  @Test
  public void anotherEvent() {
    String json = encoder.encode(new RemovePersonEvent(12));
    assertThat(json, is(equalTo("{\"personId\":12,\"event\":\"removePersonEvent\"}")));
  }

}