var Mural = {};

(function(m){
  m.App = function(options) {
    var _options = $.extend({
      mapTarget: '#map-target'
    }, options),
    _mapOptions = {
      zoom: 8,
      center: new google.maps.LatLng(39.98, -75.155),
      mapTypeId: google.maps.MapTypeId.ROADMAP
    },
    _map;
        
    var _initMap = function() {
      _map = new google.maps.Map($(_options.mapTarget).get(0), _mapOptions);
      
      
    };
    
    //Init the app
    (function init() {
      _initMap();
    })();
  };
})(Mural);

//Go go go go go!!
$(document).bind("mobileinit", function(){  
  $('#map-page').live('pagecreate',function(event){
    Mural.App();
  });  
});
