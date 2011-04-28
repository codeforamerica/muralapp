function(doc) {
    if(doc.assetId) {
        emit(doc.assetId, doc);
    }
}