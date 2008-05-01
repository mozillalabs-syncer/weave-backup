var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;

Cu.import("resource://weave/xmpp/xmppClient.js");

var transport = new HTTPPollingTransport( "http://127.0.0.1:5280/http-poll",
					  false,
					  10000 );

var auth = new PlainAuthenticator();
var client = new JabberClient("bob",
			      "jonathan-dicarlos-macbook-pro.local",
			      "iambob",
			      transport,
			      auth );

var testSync = new TestSynchronizer( client, 
				     "alice@jonathan-dicarlos-macbook-pro.local" );
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

  client.sendMessage( "alice@jonathan-dicarlos-macbook-pro.local", "Hello from Bob"  );

  for ( var x = 0; x < 10; x++ ) {
    dump( "Bob doing part " + x + " of the test.\n" );
    dump( "Bob entering barrier " + x + ".\n" );
    testSync.barrier( x );
    dump( "Bob past barrier " + x + ".\n" );
    }

  client.waitForDisconnect();
 }



  /*  var value = client.iqSet( "alice@jonathan-dicarlos-macbook-pro.local",
			    "Nonihilf", "Rocinante" );
			    dump( "Alice told me that the value of nonihilf is " + value + "\n" ); */
