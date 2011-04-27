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
    _mapTypeName = 'Map',
    _mapTypeDef = [{featureType: "road",elementType: "all",stylers: [{ saturation: -99 },{ hue: "#0000ff" }]},{featureType: "all",elementType: "labels",stylers: [{ visibility: "simplified" }]},{featureType: "road",elementType: "geometry",stylers: [{ visibility: "simplified" }]},{featureType: "road.local",elementType: "labels",stylers: [{ visibility: "on" }]},{featureType: "all",elementType: "geometry",stylers: [{ saturation: -20 }]}],
    _mapOptions = {
      zoom: 14,
      minZoom: 12,
      center: new google.maps.LatLng(39.98, -75.155),
      mapTypeId: _mapTypeName,
      mapTypeControlOptions: {
         mapTypeIds: [_mapTypeName, google.maps.MapTypeId.SATELLITE, google.maps.MapTypeId.HYBRID]
      }
    },
    _map,
    _maxExtent = new google.maps.LatLngBounds(
        new google.maps.LatLng(39.8723, -75.2803), //-75.6396, 39.5959), 
        new google.maps.LatLng(40.1379, -74.9557) //-74.5964, 40.4121)
    ),
    _markers = [],
    _myLocationMarker,
    _murals = [],
    _infoWindow = new InfoBox(),
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
            bubbleHtml += '<strong>'+mural.properties.Title+'</strong>';            
            bubbleHtml = '<div id="mid-'+mural.properties.assetId+'" class="infoBubbs" style="background-image: url(http://www.muralfarm.org/MuralFarm/MediaStream.ashx?AssetId='+mural.properties.assetId+'&SC=1)">'+bubbleHtml+'</div><br style="clear:both" />';
            
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
            
            var bubbleOptions = {
                alignBottom : true,
                content: bubbs,
                enableEventPropagation: true
            };
            _infoWindow.setOptions(bubbleOptions);
            _infoWindow.open(_map, marker);
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
    
    var _refreshDetail = function(id){
        var $detailTarget = $(_options.detailTarget).html('Loading...');
        
        $.ajax({
            url: 'pr0xy.php?page=Kml.ashx&assetId=' + id,
            dataType: 'xml',
            success: function(xml, status, xhr) {
                // All the stuff we want is in the <Placemark>
                var $detail = $('Placemark', xml);
                
                // Set the page title
                $(_options.detailHeader).html($('name', $detail).text());
                
                // The <description> field contains a big html table of asset properties, 
                // their values and one or more images.
                var $description = $($('description', $detail).text());
                
                // Get an array of all of the images
                var $images = $('img', $description);
                
                // Iterate through all the table rows & if they have two <td>s, we assume the first on
                // is a property and the second is its value.
                var $detail_rows = $('tr', $description);
                var details = {};
                details.assetId = id;
                $detail_rows.each(function(idx, el) {
                    $tds = $('td',$(el));
                    if($tds.length == 2) {
                        details[$($tds[0]).text().replace(/:/,'').trim()] = $($tds[1]).text().trim();
                    }                  
                });
                
                // And just for fun, lets grab the lat/lng
                coords = $('coordinates', $detail).text().split(',');
                if(coords.length > 1) {
                    var point = {
                        type:"Point",
                        coordinates: [coords[0], coords[1]]
                    };
                    details.geometry = point;
                }
                
                
                $detailTarget.html($('description', $detail).text());
            },
            error: function(xhr, status, error) {
                console.log('server-side failure with status code ' + status);
            }
        });
    };
    
    var _refreshDetailList = function() {
      var $list = $(_options.listTarget).empty(),
        html = '<ul data-role="listview" data-inset="true" data-theme="d">';
      
      $.each(_murals, function(i, mural){
console.log(mural);
          html += '<li><img src="http://www.muralfarm.org/MuralFarm/MediaStream.ashx?AssetId='+mural.properties.assetId+'&SC=1" alt="'+mural.properties.Title+'" class="ul-li-icon">' +
              '<a href="details.html?id='+ mural.properties.assetId +'">'+mural.properties.Title+'</a><div class="distance">'+parseInt(mural.properties.distance * 3.2808399)+' feet away</div></li>';          
      });
      html += '</ul>';
      
      $list.append(html);
      
      $list.find('ul').listview();
    };
    
    // Where are we?
    _self.findMe = function(latLng) {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition( function(position) {
                latLng = latLng || new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
                
                //Clear the marker if it exists
                if(_myLocationMarker) {
                  _myLocationMarker.setMap(null);
                }
                
                //Add a marker on my current location
                _myLocationMarker = new google.maps.Marker({
                    map: _map,
                    position: latLng,
                    icon: _options.locationIcon
                });
                
                //If I'm in Philly, go to that location
                if (_maxExtent.contains(latLng)) {
                    _map.setCenter(latLng); 
                    _self.refresh();                   
                } else {
                    alert('We couldn\'t locate you inside of Philly.');
                }
            }, 
            function(msg){
                console.log(msg);   
            });
        } 
    };    
    
    _self.refresh = function(latLng) {
        // Figure out the bounding box for the query
        var f = 0.015;
        latLng = latLng || _map.getCenter();
        bbox = {'minx': (latLng.lng()-f),
                'miny': (latLng.lat()-f),
                'maxx': (latLng.lng()+f),
                'maxy': (latLng.lat()+f)
        };

        // Ask for the mural data from muralfarm.org (via our proxy php script)
        $.ajax({
            url: 'http://muralapp.iriscouch.com/murals/_design/geo/_spatiallist/radius/full?radius=1000&bbox='+bbox.minx+','+bbox.miny+','+bbox.maxx+','+bbox.maxy,
            crossDomain: true,
            dataType: 'jsonp',
            success: function (data, textStatus, jqXHR) {
                _murals = data.features;
                // Sort the murals from closest to farthest
                function compareDist(a, b) { return  a.properties.distance - b.properties.distance; }
                _murals.sort(compareDist);
                _murals = _murals.slice(0,10);
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
            _self.refresh(); 
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

$('#list-page').live('pageshow',function(event){
    app = app || Mural.App();
    app.refresh();
});
