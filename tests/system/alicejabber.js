var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;

Cu.import("resource://weave/xmpp/xmppClient.js");

var transport = new HTTPPollingTransport( "http://127.0.0.1:5280/http-poll",
					  false,
					  10000 );

var auth = new PlainAuthenticator();
var client = new JabberClient("alice",
			      "jonathan-dicarlos-macbook-pro.local",
			      "iamalice",
			      transport,
			      auth );
		
var testSync = new TestSynchronizer( client, 
				     "bob@jonathan-dicarlos-macbook-pro.local" );
client.registerMessageHandler( testSync );

// Note: for ejabberd, the correct string to use for "host" here, when
// connecting, is what's specified on the {hosts, ... line of ejabberd.cfg.
client.connect( "jonathan-dicarlos-macbook-pro.local" );  // jabber host


client.waitForConnection();
if ( client._connectionStatus == client.FAILED ) {
  dump( "Connection attempt failed.  Boo hoo!\n" );
 } else {
  client.announcePresence();
  testSync.waitForPartnerOnline();
 
  for ( var x = 0; x < 10; x++ ) {
    dump( "Alice doing part " + x + " of the test.\n" );
    dump( "Alice entering barrier " + x + ".\n" );
    testSync.barrier( x );
    dump( "Alice past barrier " + x + ".\n" );
    }
  
  client.waitForDisconnect();
 }

/*
var aliceMessageHandler = {
 handle: function( msgText, from ) {
    client.sendMessage( from,
			"Nice to meet you " + from + ", I am alice." );
  }
};
var aliceIqResponder = {
 set: function( variable, value ) {
    dump( variable + " set to " + value );
  },
 get: function( variable ) {
    if ( variable == "Nonihilf" ) {
      return "Gyabo!";
    } else {
      return "I don't have a variable called that.";
    }
  }
}
*/
