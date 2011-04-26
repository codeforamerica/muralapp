var Mural = {};

(function(m){
  m.App = function(options) {
    var _options = $.extend({
      mapTarget: '#map-target',
      listTarget: '#list-container',
      detailTarget: '#detail-container',
      detailHeader: '#detail-header'
    }, options),
    _mapOptions = {
      zoom: 14,
      center: new google.maps.LatLng(39.98, -75.155),
      mapTypeId: google.maps.MapTypeId.ROADMAP
    },
    _map,
    _markers = [],
    _murals = [],
    _infoWindow = new InfoBox(),
    _self = {};

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

		var link = (node.getElementsByTagName('link')[0]) ? node.getElementsByTagName('link')[0].textContent : '';

        // Most of these descriptions have an img tag in the html.
		// We want to pull the image tag out, clean it, and put it in its own var.
        var pieces = node.getElementsByTagName('description')[0].textContent.split('&nbsp;',2);
        // SUPERHACK! We need to strip out the annoying align="left" attribute from the img tag
        pieces[0] = pieces[0].replace(/align="left"/ig,"");

		// Pull the assetId off of the end of the link
		var assetId = link.match(/assetId=(\d)*/gi);
		assetId = (assetId) ? assetId[0].replace(/assetId=/gi, '') : '';

        var mural = {
			'assetId':assetId,
            'title': node.getElementsByTagName('title')[0].textContent,
            'description': (pieces[1]) ? pieces[1].replace(/<br \/><br \/>/ig,"").trim() : pieces[0],
            'image': (pieces[0].indexOf('img') != -1) ? pieces[0] : '',
            'link': link,
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
            var bubbleHtml = '';
            //bubbleHtml += '<a href="details.html?id='+mural.assetId+'"><img src="http://www.muralfarm.org/MuralFarm/MediaStream.ashx?AssetId='+mural.assetId+'&SC=1" /></a>';
            bubbleHtml += '<strong><a href="#details.html?id='+mural.assetId+'">'+mural.title+'</a></strong>';            

            bubbleHtml = '<div class="infoBubbs" style="background-image: url(http://www.muralfarm.org/MuralFarm/MediaStream.ashx?AssetId='+mural.assetId+'&SC=1)">'+bubbleHtml+'</div><br style="clear:both" />';
            var bubbleOptions = {
                alignBottom : true,
                content: bubbleHtml
            };
            _infoWindow.setOptions(bubbleOptions);
            _infoWindow.open(_map, marker);
            
            $('.infoBubbs').parent().css('overflow','visible');

        });
    };

    var _refreshMarkers = function(){
        _clearMarkers();

        // Add points to the map
        $.each(_murals, function(i, mural){
            if(mural && mural.coordinates) {
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
                
                // NOTE: If we wanted to start dumping the data into a CouchDB we could now.  We have
                //       an object with geojson coordinates.
                $.couch.urlPrefix = 'couchdb/couch_proxy.php?db=';
                
                $.couch.db('assets').view('assets/assetid',{ 
                    keys: [details.assetId], 
                    success: function(data, status, xhr) {
                        if(data.rows.length === 0) {
                            $.couch.db('assets').saveDoc(details);
                        }
                    }
                });
                
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
          html += '<li><img src="'+$(mural.image).attr('src')+'" alt="'+mural.title+'" class="ul-li-icon">' +
              '<a href="details.html?id='+ mural.assetId +'">'+mural.title+'</a></li>';          
      });
      html += '</ul>';
      
      $list.append(html);
      
      $list.find('ul').listview();
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
                _murals = [];
                
                $("channel item", xml).each(function(i, node){
                   _murals.push(_dirtyXML2JsonConversion(node)); 
                });
                
                // HACK - the last element in the array need
                _murals.pop();

                _refreshMarkers();
                _refreshDetailList();
            },
            error: function(xhr, status, error) {
                console.log('server-side failure with status code ' + status);
            }
        });
    };

    var _initMap = function() {
      _map = new google.maps.Map($(_options.mapTarget).get(0), _mapOptions);
      
      google.maps.event.addListener(_map, 'dragend', function() {
        _self.refresh();
      });
    };
    
    //Init the app
    _initMap();       

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