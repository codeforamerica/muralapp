var Mural = {};

(function(m){
  m.App = function(options) {
    var _options = $.extend({
      mapTarget: '#map-target',
      listTarget: '#list-container',
      detailTarget: '#detail-container',
      detailHeader: '#detail-header',
      muralIcon: 'mural-icon-pin-32.png',
      locationIcon: 'location-icon-pin-32.png'
    }, options),
    //Map Styles
    _mapTypeName = 'Map',
    _mapTypeDef = [{featureType: "road",elementType: "all",stylers: [{ saturation: -99 },{ hue: "#0000ff" }]},{featureType: "all",elementType: "labels",stylers: [{ visibility: "simplified" }]},{featureType: "road",elementType: "geometry",stylers: [{ visibility: "simplified" }]},{featureType: "road.local",elementType: "labels",stylers: [{ visibility: "on" }]},{featureType: "all",elementType: "geometry",stylers: [{ saturation: -20 }]}],
    _mapOptions = {
      zoom: 16,

      center: new google.maps.LatLng(39.95185, -75.16382),
      mapTypeId: _mapTypeName,
      mapTypeControlOptions: {
         mapTypeIds: [_mapTypeName, google.maps.MapTypeId.SATELLITE, google.maps.MapTypeId.HYBRID]
      }
    },
    //Map objects
    _map,
    _markers = [],
    _lastSearchLatLng,
    _myLocationLatLng,
    _myLocationMarker,
    _infoWindow = new InfoBox(),
    _directionsService = new google.maps.DirectionsService(),
    //Mural cache
    _murals = [],
    _self = {};

    var _clearMarkers = function() {
        for(var i=0; i < _markers.length; i++) {
            _markers[i].setMap(null);
        }
        _markers = [];
    };

    var _addMarker = function(mural) {
        var latLng = new google.maps.LatLng(mural.geometry.coordinates[1], mural.geometry.coordinates[0]);
        var marker = new google.maps.Marker({
            map: _map,
            position: latLng,
            icon: _options.muralIcon
        });
        _markers.push(marker);

        google.maps.event.addListener(marker, "click", function() {
            // Build the html for our GMaps infoWindow
            var bubbleHtml = '';
            bubbleHtml += '<strong>'+mural.properties.title+'</strong><br />';
            bubbleHtml += '<img src="'+mural.properties.imgs[0]+'" />';            
            bubbleHtml = '<div id="mid-'+mural.properties.internalId+'" class="infoBubbs">'+bubbleHtml+'</div><br style="clear:both" />';

            // Evidently we need to create the div the old fashioned way
            // for the infoWindow.
            var bubbs = document.createElement("div");
            bubbs.className = 'bubbleWrap';
            bubbs.innerHTML = bubbleHtml;

            $(bubbs).find('.infoBubbs').bind('tap',function(ev) {
                // The id of the element is in the form mid-XX where XX is the assetId.
                var pieces = this.id.split('-');

                // Build our url
                var url = 'details.html?id='+pieces[1];

                // Manually change the page
                $.mobile.changePage(url);
            });
            
            var winContent = '<div class="win-content">' + 
              '<div class="win-title">'+mural.properties.title+'</div>' +
              '<img src="'+mural.properties.imgs[0]+'" />' + 
              '<a href="javascript:void(0);" data-assetid="'+mural.properties.internalId+
                  '" class="win-details-link">More details...</a>' +  
            '</div>';
            
            var newOffset = new google.maps.Size(-62,3,'px','px');
            var winOptions = {
                content: bubbs,
                enableEventPropagation: true,
                position: latLng,
                pixelOffset: newOffset,
                closeBoxMargin: '18px 8px 2px 2px'
            };
            
            _infoWindow.setOptions(winOptions);
            _infoWindow.open(_map, marker);
            
            $('.win-details-link').bind('tap',function(ev) {
                // Build our url
                var url = 'details.html?id='+$(this).attr('data-assetid');

                // Manually change the page
                $.mobile.changePage(url);
            });
        });
    };

    var _refreshMarkers = function(){
        _clearMarkers();
        _infoWindow.close();

        // Add points to the map
        $.each(_murals, function(i, mural){
            if(mural && mural.geometry) {
                _addMarker(mural);
            }            
        });
    };
    
    var calcDistance = function(mural) {
      var request = {
        origin:_myLocationLatLng, 
        destination: new google.maps.LatLng(mural.geometry.coordinates[1], mural.geometry.coordinates[0]),
        travelMode: google.maps.DirectionsTravelMode.WALKING
      };
      
      _directionsService.route(request, function(result, status) {        
        if (status == google.maps.DirectionsStatus.OK) {
          $('.mural-dist-'+mural.properties.internalId).text('You are ' + result.routes[0].legs[0].distance.text + ' away.');
        }
      });
    };
    
    var _refreshDetailList = function() {
      var $list = $(_options.listTarget).empty(),
        html = '<ul data-role="listview" data-inset="true" data-theme="d">';
      
      $.each(_murals, function(i, mural){
          html += '<li><img src="'+mural.properties.imgs[0]+'" alt="'+mural.properties.title + '" class="ul-li-icon">' +
              '<a href="details.html?id='+ mural.properties.internalId +'">' + mural.properties.title + '</a>';

          if (_myLocationLatLng) {
            html += '<div class="mural-dist-'+mural.properties.internalId + ' distance"></div>';
          }
          html += '</li>';
      });
      html += '</ul>';
      $list.append(html);
      
      if (_myLocationLatLng) {
        $.each(_murals, function(i, mural) {
          calcDistance(mural);
        });
      }      
      
      $list.find('ul').listview();
    };
    
    // Where are we?
    _self.findMe = function() {
      
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition( function(position) {
                var latLng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
                
                //Clear the marker if it exists
                if(_myLocationMarker) {
                  _myLocationMarker.setMap(null);
                }
                
                
                _myLocationLatLng = latLng;
                
                //Add a marker on my current location
                _myLocationMarker = new google.maps.Marker({
                    map: _map,
                    position: _myLocationLatLng,
                    icon: _options.locationIcon
                });

                _map.setCenter(_myLocationLatLng); 
                _self.refresh(_myLocationLatLng);                   
           
            }, 
            function(msg){
              alert('We couldn\'t locate your position.');
            },
            { enableHighAccuracy: true, maximumAge: 90000 });
        } 
    };    
    
    _self.refresh = function(latLng) {
        var ajaxUrl;
        // Figure out the bounding box for the query
        var f = 0.015;
        latLng = latLng || _lastSearchLatLng || _map.getCenter();
        bbox = {'minx': (latLng.lng()-f),
                'miny': (latLng.lat()-f),
                'maxx': (latLng.lng()+f),
                'maxy': (latLng.lat()+f)
        };

        _lastSearchLatLng = latLng;

        // "Where da art at?" she ajaxed the couch.
        $.ajax({
            url: Muralapp.db.path+'/_design/geo/_spatiallist/geojson/full?bbox=1000&bbox='+
                bbox.minx+','+bbox.miny+','+bbox.maxx+','+bbox.maxy,
            crossDomain: true,
            dataType: 'jsonp',
            success: function (data, textStatus, jqXHR) {
                _murals = data.features;
                // Structure the data a bit
                $.each(_murals, function(i, mural){
                    mapMuralProperties(mural.properties);
                });
console.log(_murals);
                // Sort the murals from closest to farthest
                function compareDist(a, b) { return  a.properties.distance - b.properties.distance; }
                _murals.sort(compareDist);
                
                // Only keep the closest 10
                _murals = _murals.slice(0,50);
                
                // Update the map markers and the listing page
                _refreshMarkers();
                _refreshDetailList();
            }
        });
    };

    var _initMap = function() {
        _map = new google.maps.Map($(_options.mapTarget).get(0), _mapOptions);

        var mapType = new google.maps.StyledMapType(_mapTypeDef, { name: _mapTypeName});

        _map.mapTypes.set(_mapTypeName, mapType);
        _map.setMapTypeId(_mapTypeName);

        google.maps.event.addListener(_map, 'dragend', function() {
            _self.refresh(_map.getCenter()); 
        });
    };
    
    var _initFindMe = function() {
      $('.find-me').live('click', function(){
          _self.findMe();
      });  
    };
    
    //Init the app
    _initMap();
    _initFindMe();
    _self.findMe();   

    return _self;
  };
})(Mural);

//Go go go go go!!
var app;
$('#map-page').live('pagecreate',function(event){
    app = app || Mural.App();
    app.refresh();
});

$('#list-page').live('pagecreate',function(event){
    app = app || Mural.App();
    app.refresh();
});

// This function exists to try to wrangle unstructured data into line
// so that our scripts don't blow up down the line.
function mapMuralProperties(m) {
    m.interalId = m.assetId || m.accession_id;
    delete m.assetId;
    
    m.title = m.Title || m.title;
    delete m.Title;
    
    m.imgs = [];
    m.imgs[0] = 'http://www.muralfarm.org/MuralFarm/MediaStream.ashx?AssetId='+m.interalId+'&SC=1';
    if(m.mediaIds) {
        $.each(m.mediaIds, function(i, el) {
           m.imgs.push('http://www.muralfarm.org/MuralFarm/MediaStream.ashx?mediaID='+el+'&.jpg');
        });
        delete m.mediaIds;
    }
}
