(function(){  
   var request = require('request'),
    $ = require('jquery'),
    _options = {
      muralUrl: 'http://www.muralfarm.org/Muralfarm/Kml.ashx', //&assetId=
      couchUrl: 'http://muralapp.iriscouch.com/'
    };
  
  //add a json object to couch
  var addToCouch = function(doc, db) {    
    request({
        method: 'POST', 
        uri: _options.couchUrl + db,
        headers: {
          'content-type': 'application/json'
        },
        body:JSON.stringify(doc)
    }, function (error, response, xml) {
      if (error) {
        console.log('Error adding doc to couch.' + error);
      }
    });  
  };

  //go get the list of projects for the specified page, parse the xml, and handle with the 'end' event above  
  var getMuralDetails = function (id) {
    var url = _options.muralUrl+'?assetId='+id;
    
    request({uri:url}, function (error, response, xml) {
      if (!error && response.statusCode === 200) {        
        var details = {},
          mediaRegex = /=(\d+)&.jpg$/,
          $detail = $('Placemark', xml);
        
        // The <description> field contains a big html table of asset properties, 
        // their values and one or more images.
        var $description = $($('description', $detail).html());

        // Get an array of all of the images
        var $images = $('img', $description);
        
        details.mediaIds = [];
        $images.each(function(i, imgEl) {
          var mediaId = mediaRegex.exec($(imgEl).attr('src'))[1];
          details.mediaIds.push(mediaId);
        });
        
        // Iterate through all the table rows & if they have two <td>s, we assume the first on
        // is a property and the second is its value.
        var $detail_rows = $('tr', $description);

        details.assetId = id;
        $detail_rows.each(function(idx, el) {
            $tds = $('td',$(el));
            if($tds.length == 2) {
                details[$($tds[0]).text().replace(/:/,'').trim()] = $($tds[1]).text().trim();
            }                  
        });
        
        // And just for fun, lets grab the lat/lng
        var coords = $('coordinates', $detail).text().split(',');
        if(coords.length > 1) {
            var point = {
                type:"Point",
                coordinates: [parseFloat(coords[0]), parseFloat(coords[1])]
            };
            details.geometry = point;
        }

        //Only add to the couch if we have 
        if (details.geometry && details.mediaIds.length) {
          console.log('Adding ' + details.assetId + ' to couch.');
          addToCouch(details, 'murals');
        }
      } else {
        console.log('No mural found for id ' + id);
      }
    });
  };

  var i = 1;
  var id = setInterval(function(){
    console.log('Requesting mural ' + i);
    getMuralDetails(i);
    
    i++;
    if (i > 1800) {
      clearInterval(id);
    }
  }, 500);
})();