(function(m){
  m.Details = function(options) {
    var _options = $.extend({
      detailTarget: '.detail-container',
      detailHeader: '.detail-header'
    }, options),
    _id;

    function _refreshDetail(id) {
        var $container = $('div[data-url*="details.html?id='+id+'"]'),
            $detailTarget = $(_options.detailTarget, $container).html('Loading...');
        
        $.ajax({
            url: 'pr0xy.php?page=Kml.ashx&assetId=' + id,
            dataType: 'xml',
            success: function(xml, status, xhr) {
                // All the stuff we want is in the <Placemark>
                var $detail = $('Placemark', xml);
                
                // Set the page title
                $(_options.detailHeader, $container).html($('name', $detail).text());
                
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
                
                // Where are we?
                if (navigator.geolocation) {
                   navigator.geolocation.getCurrentPosition(
                       function(position) {
                         var p1 = [position.coords.latitude, position.coords.longitude];
                         var p2 = [coords[1], coords[0]];
                         //alert(p1[0] + ',' +p1[1]);
                         console.log(p2);
                       }, 
                       function(msg){
                         console.log(msg);
                       },
                       { enableHighAccuracy: true }
                   );
                } 
                
                $detailTarget.html($('description', $detail).text());
            },
            error: function(xhr, status, error) {
                console.log('server-side failure with status code ' + status);
            }
        });
    };
    
    //http://stackoverflow.com/questions/901115/get-querystring-values-in-javascript
    function _getParameterByName( name )
    {
      name = name.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
      var regexS = "[\\?&]"+name+"=([^&#]*)";
      var regex = new RegExp( regexS );
      var results = regex.exec( window.location.href );
      if( results == null )
        return "";
      else
        return decodeURIComponent(results[1].replace(/\+/g, " "));
    }
    
    http://stackoverflow.com/questions/27928/how-do-i-calculate-distance-between-two-latitude-longitude-points
    function _calcDistance(point1, point2) {
        var R = 6371; // Radius of the earth in km
        var dLat = (point2[0]-point1[0]).toRad();  // Javascript functions in radians
        var dLon = (point2[1]-point1[1]).toRad(); 
        var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(point1[0].toRad()) * Math.cos(point2[0].toRad()) * 
                Math.sin(dLon/2) * Math.sin(dLon/2); 
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
        var d = R * c; // Distance in km
        
        return d;
    }
    
    
    //Init the app
    (function init() {
       //Get the id from the url
       _id = _getParameterByName('id');
       _refreshDetail(_id);
    })();
  };
})(Mural);

//Go go go go go!!
$('.detail-page').live('pageshow',function(event){
    Mural.Details();
});