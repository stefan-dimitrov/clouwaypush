package com.clouway.push.server;

import com.clouway.push.client.channelapi.PushChannelService;
import com.clouway.push.shared.util.DateTime;
import com.google.appengine.api.channel.ChannelService;
import com.google.appengine.api.channel.ChannelServiceFactory;
import com.google.appengine.api.memcache.MemcacheService;
import com.google.appengine.api.memcache.MemcacheServiceFactory;
import com.google.inject.AbstractModule;
import com.google.inject.Provider;
import com.google.inject.Provides;
import com.google.inject.Singleton;
import com.google.inject.name.Named;
import com.google.inject.name.Names;
import com.google.inject.servlet.ServletModule;

/**
 * @author Ivan Lazov <ivan.lazov@clouway.com>
 */
public class PushChannelModule extends AbstractModule {

  private final String serializationPolicyDirectory;
  private int subscriptionsExpirationMinutes;

  public PushChannelModule(String serializationPolicyDirectory, int subscriptionsExpirationMinutes) {
    this.serializationPolicyDirectory = serializationPolicyDirectory;
    this.subscriptionsExpirationMinutes = subscriptionsExpirationMinutes;
  }

  @Override
  protected final void configure() {

    bind(PushService.class).to(PushServiceImpl.class).in(Singleton.class);
    bind(String.class).annotatedWith(Names.named("SerializationPolicyDirectory")).toInstance(serializationPolicyDirectory);
    bind(SubscriptionsRepository.class).to(MemcacheSubscriptionsRepository.class);

    install(new ServletModule() {
      @Override
      protected void configureServlets() {
        serve("/pushChannelService").with(PushChannelServiceImpl.class);
        serve("/pushService").with(PushChannelRestService.class);
      }
    });
  }

  @Provides
  @SubscriptionsExpirationDate
  DateTime getSubscriptionExpirationDate() {
    return new DateTime().plusMills(subscriptionsExpirationMinutes * 60 * 1000);
  }

  @Provides
  @SubscriptionsExpirationMills
  Integer getSubscriptionExpirationMills() {
    return subscriptionsExpirationMinutes * 60 * 1000;
  }

  @Provides
  @CurrentDate
  DateTime getCurrentDate() {
    return new DateTime();
  }

  @Provides
  @Named("MemcacheService")
  MemcacheService getMemcacheService() {
    return MemcacheServiceFactory.getMemcacheService();
  }

  @Provides
  @Singleton
  public Encoder getEncoder(@Named("SerializationPolicyDirectory") String serializationPolicyDirectory) {
    return new RpcEncoder(serializationPolicyDirectory);
  }

  @Provides
  public EncoderFactory getEncoderFactory(Encoder encoder) {
    return new GenericEncoderFactory(encoder, new JsonEncoder());
  }

  @Provides
  public ChannelService getChannelService() {
    return ChannelServiceFactory.getChannelService();
  }

  @Provides
  public PushChannelService getPushChannelService(Provider<SubscriptionsRepository> subscriptionsRepository,
                                                  @SubscriptionsExpirationDate Provider<DateTime> subscriptionsExpirationDate) {
    return new PushChannelServiceImpl(subscriptionsRepository, subscriptionsExpirationDate);
  }
}
