var Cc = Components.classes;
var Ci = Components.interfaces;

function TestSynchronizer( jabberClient, partnerJid ) {
  this._init( jabberClient, partnerJid );
}
TestSynchronizer.prototype = {
 _init: function( jabberClient, partnerJid ) {
    this._step = 0;
    this._jabberClient = jabberClient;
    this._partnerJid = partnerJid;
    this._partnerStep = 0;
    this._partnerOnline = false;
  },

  __threadManager: null,
  get _threadManager() {
    if (!this.__threadManager)
      this.__threadManager = Cc["@mozilla.org/thread-manager;1"].getService();
    return this.__threadManager;
  },

 __timer: null,
 get _timer() {
    if (!this.__timer)
      this.__timer = Cc["@mozilla.org/timer;1"].createInstance( Ci.nsITimer );
    return this.__timer;
  },

 waitForPartnerOnline: function( ) {
    this._timer.initWithCallback( this, 
				  10000, 
				  this._timer.TYPE_REPEATING_SLACK );

    var thread = this._threadManager.currentThread;
    while ( this._partnerOnline == false ) {
      thread.processNextEvent( true );      
    }

  },
 
 notify: function( timer ) { // calback for timer
    this._jabberClient.sendMessage( this._partnerJid, "UTHERE?" );
  },

 handle: function( msgText, from ) {  // callback for incoming message
    if ( from.indexOf( this._partnerJid ) == 0 ) {
      if ( msgText == "UTHERE?" ) {
	this._jabberClient.sendMessage( this._partnerJid, "YAH" );
	return;
      }
      if ( msgText == "YAH" ) {
	this._partnerOnline = true;
	dump( "I have gotten YAH, so my partner is online.\n" );
	this._timer.cancel();
	return;
      }
      dump( "testSynchronizer received " + msgText + "\n" );
      var msgInt = parseInt( msgText );
      if ( msgInt ) {
	this._partnerStep = msgText;
	dump( "step set to " + this._step + "\n" );
      }
    }
  },

 wait: function( stepNumber ) {
    var thread = this._threadManager.currentThread;
    while( this._partnerStep < stepNumber ) {
      thread.processNextEvent( true );
    }
  },

 barrier: function( stepNumber ) {
    this._step = stepNumber;
    // Send a message to the other side to let them know what step I'm at...
    this._jabberClient.sendMessage( this._partnerJid, stepNumber );
    
    this.wait( stepNumber );
  },
};
