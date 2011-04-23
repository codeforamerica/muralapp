var Mural = {};

(function(m){
  m.App = function(options) {
    var _options = $.extend({
      mapTarget: '#map-target'
    }, options),
    _mapOptions = {
      zoom: 12,
      center: new google.maps.LatLng(39.98, -75.155),
      mapTypeId: google.maps.MapTypeId.ROADMAP
    },
    _map,
    _markers = [];

    // It seems like we are getting slightly dodgey data, so this function should fix the latlng points
	var _fixLatLng = function(latlng) {
		latlng[0] = latlng[0] * 2.6232 - 80.1968;
		latlng[1] = latlng[1] * 1.964 + 159.8395;
		return latlng;
	};

    var _dirtyXML2JsonConversion = function(node) {
        var coords = node.getElementsByTagNameNS('http://www.georss.org/georss/','point');

        if(coords.length && coords.textContent != '') {
            coords = coords[0].textContent.split(' ');
            coords = _fixLatLng(coords);
        }

        // Most of these descriptions have an img tag in the html.
        // We want to put ou
        var pieces = node.getElementsByTagName('description')[0].textContent.split('&nbsp;',2);
        // SUPERHACK! We need to strip out the annoying align="left" attribute from the img tag
        pieces[0] = pieces[0].replace(/align="left"/ig,"");

        var mural = {
            'title': node.getElementsByTagName('title')[0].textContent,
            //'description': node.getElementsByTagName('description')[0].textContent,
            'description': (pieces[1]) ? pieces[1].replace(/<br \/><br \/>/ig,"") : pieces[0],
            'image': (pieces[0].indexOf('img') != -1) ? pieces[0] : '',
            'link': (node.getElementsByTagName('link')[0]) ? node.getElementsByTagName('link')[0].textContent : '',
            'pubDate': (node.getElementsByTagName('pubDate')[0]) ? node.getElementsByTagName('pubDate')[0].textContent : '',
            'coordinates': coords
        };

        return mural; 
    };

    var _clearMarkers = function() {
        for(var i=0; i < _markers.length; i++) {
            _markers[i].setMap(null);
        }
        _markers = [];
    };

    var _addMarker = function(mural) {
        var latLng = new google.maps.LatLng(mural.coordinates[0], mural.coordinates[1]);
        var marker = new google.maps.Marker({
            map: _map,
            position: latLng
        });

        _markers.push(marker);

        google.maps.event.addListener(marker, "click", function() {
            var bubbleHtml = '<h3>'+mural.title+'</h3>';
            bubbleHtml += ''+mural.description+'';
            bubbleHtml += '<a href="'+mural.link+'">learn more...</a>';
            tweetBubble.setContent(bubbleHtml);
            tweetBubble.open(mapPanel.map, marker);
        });
    };

    var _refreshMarkers = function(murals){
        _clearMarkers();

        // Add points to the map
        for(var i=0, ln = murals.length-1; i < ln; i++){
            if(murals[i] && murals[i].coordinates) {
                _addMarker(murals[i]);
            }
        }
    };
    
    var _refreshDetails = function() {
      
    };
    
    var _refresh = function(latLng) {
        console.log(latLng);
      

        // Figure out the bounding box for the query
        var f = 0.015;
        bbox = {'minx': (latLng.lng()-f),
                'miny': (latLng.lat()-f),
                'maxx': (latLng.lng()+f),
                'maxy': (latLng.lat()+f)
                };

        // Change the projection
        // creating source and destination Proj4js objects
        var source = new Proj4js.Proj('WGS84');    //source coordinates will be in Longitude/Latitude
        var dest = new Proj4js.Proj('EPSG:900913');     //destination coordinates in Google Mercator

        // transforming point coordinates
        var nw = new Proj4js.Point(bbox.minx,bbox.maxy); 
        Proj4js.transform(source, dest, nw);     

        // transforming point coordinates
        var se = new Proj4js.Point(bbox.maxx,bbox.miny);
        Proj4js.transform(source, dest, se); 

        // Ask for the mural data from muralfarm.org (via our proxy php script)
        $.ajax({
            url: 'pr0xy.php?page=RssFeed.ashx&type=area&minx='+nw.x+'&miny='+se.y+'&maxx='+se.x+'&maxy='+nw.y,
            dataType: 'xml',
            success: function(xml, status, xhr) {
                console.log(xml);
                var murals = [];
                
                $("channel item", xml).each(function(i, node){
                   murals.push(_dirtyXML2JsonConversion(node)); 
                });

                console.log(murals);

                _refreshMarkers(murals);
                //_refreshDetails(murals);
            },
            error: function(xhr, status, error) {
                console.log('server-side failure with status code ' + status);
            }
        });
    };

    var _initMap = function() {
      _map = new google.maps.Map($(_options.mapTarget).get(0), _mapOptions);
      
      google.maps.event.addListener(_map, 'dragend', function() {
        _refresh(_map.getCenter());
      });
    };
    
    //Init the app
    (function init() {
      _initMap();
    })();
  };
})(Mural);

//Go go go go go!!
$(document).bind("mobileinit", function(){  
});

$('#map-page').live('pagecreate',function(event){
    Mural.App();
});  
