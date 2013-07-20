var S3MultipartUploader = (function() {

function S3MultipartUploader(fileDOM, settings) {
    var me = this;
    me.fileDOM = fileDOM;
    me.chunkSize = settings.chunkSize || (5 * 1024 * 1024);

    me.s3AccessKey = settings.s3AccessKey;
    me.s3BucketName = settings.s3BucketName;
    me.s3BucketUrl = settings.s3BucketUrl || "//" + me.s3BucketName + ".s3.amazonaws.com";
    me.s3DestFolderPrefix = settings.s3DestFolderPrefix || "/";

    me.serverBase = settings.serverBase || "/";
    me.serverInitMultipartUrl = settings.serverInitMultipartUrl || (me.serverBase + "init_multipart");
    me.serverSendChunkUrl = settings.serverSendChunkUrl || (me.serverBase + "send_chunk");
    me.serverCompleteChunkUrl = settings.serverCompleteChunkUrl || (me.serverBase + "complete_chunk");
    me.serverCompleteFileUrl = settings.serverCompleteFileUrl || (me.serverBase + "complete_file");

    me.onChange = settings.onChange || function() {};
    me.onInitSuccess = settings.onInitSuccess || function() {};
    me.onProgress = settings.onProgress || function() {};
    me.onDone = settings.onDone || function() {};

    me.files = [];
    me.filesDone = [];
    me.etags = {};
    me.progress = {};

    me.fileDOM.change(me.onChange);
    me.fileDOM.change(function() {
        // Empty and re-insert
        me.files.length = 0;
        $.each(me.fileDOM.prop("files"), function(i, e) {
            me.files.push(e);
        });
    });
}

S3MultipartUploader.prototype.startUpload = function() {
    console.log("inside startUpload");
    var me = this;
    console.log(me.fileDOM);
    console.log(me.files);

    me.numFileChunk = {};
    me.fileChunk = {};
    me.fileSize = {};
    $.each(me.files, function(i, file) {
        me.fileSize[i] = file.size;
        var numChunk = Math.ceil(file.size / me.chunkSize);
        me.numFileChunk[i] = numChunk;
        me.fileChunk[i] = [];
        me.etags[i] = {};

        // S3 chunk number starts from 1
        for(var n = 1; n <= numChunk; n++) {
            me.fileChunk[i].push(n);
        }
    });
    console.log(me.numFileChunk);
    console.log(me.fileChunk);

    $.each(me.fileChunk, function(fileNo, _) {
        me.initServer({fileNo: fileNo}, me.initS3);
    });
}


S3MultipartUploader.prototype.initServer = function(fparams) {
    console.log("inside initServer");
    var me = this;
    var fileNo = fparams.fileNo;
    $.get(me.serverInitMultipartUrl, 
        {
            "objectName": me.files[fileNo].name
        }
    ).done(function(params) {
        console.log("initServer success");
        me.initS3(merge(fparams, params));
    }).fail(function() {
        console.log("initServer error");
        me.initServer(fparams);
    });
}

S3MultipartUploader.prototype.initS3 = function(fparams) {
    console.log("inside initS3");
    var me = this;
    var fileNo = fparams.fileNo;

    var url = fparams.url;
    var date = fparams.date;
    var authorization = fparams.authorization;

    $.ajax({
        url: url, 
        type: "POST",
        dataType: "xml",
        headers: {
            "x-amz-date": date,
            "Authorization": authorization
        },
        success: function(result) {
            console.log("initS3 success");
            me.onInitSuccess();
            var uploadId = $(result).find("UploadId").text();
            params = {
                "uploadId": uploadId
            };
            $.each(me.fileChunk[fileNo], function(_, chunkId) {
                params.chunkId = chunkId;
                me.sendChunkServer(merge(fparams, params));
            });
        },
        error: function() {
            console.log("initS3 error");
            me.initS3(fparams);
        }
    });
}

S3MultipartUploader.prototype.sendChunkServer = function(fparams) {
    console.log("inside sendChunkServer");
    var me = this;
    var uploadId = fparams.uploadId;
    var fileNo = fparams.fileNo;
    var chunkId = fparams.chunkId;

    var file = me.files[fileNo];
    var fileChunk = me.fileChunk[fileNo];

    var start = (chunkId - 1) * me.chunkSize;
    var end = Math.min(start + me.chunkSize, me.fileSize[fileNo]);
    console.log(start, end);

    var blob = file.slice(start, end);
    var fileReader = new FileReader();
    fileReader.addEventListener("loadend", function() {
        var result = fileReader.result;
        var contentMD5 = rstr2b64(rstr_md5(result));

        $.get(me.serverSendChunkUrl, 
            {
                "objectName": file.name,
                "partNumber": chunkId,
                "uploadId": uploadId,
                "contentMD5": contentMD5
            }
        ).done(function(params) {
            console.log("sendChunkServer done");
            params.contentMD5 = contentMD5;
            params.blob = blob;
            me.sendChunkS3(merge(fparams, params), fparams);
        }).fail(function(params) {
            console.log("sendChunkServer fail");
            me.sendChunkServer(fparams);
        });
    });
    fileReader.readAsBinaryString(blob);
}

S3MultipartUploader.prototype.sendChunkS3 = function(fparams, prevParams) {
    console.log("inside sendChunkS3");
    var me = this;
    var fileNo = fparams.fileNo;
    var chunkId = fparams.chunkId;
    var contentMD5 = fparams.contentMD5;
    var blob = fparams.blob;

    var url = fparams.url;
    var date = fparams.date;
    var authorization = fparams.authorization;

    var progressHandler = function(e) {
        me.progress[[fileNo, chunkId]] = e.loaded;

        var newE = {
            "loaded": getLoadedSize.call(me),
            "total": getTotalSize.call(me)
        };
        me.onProgress(newE);
    };

    $.ajax({
        url: url, 
        type: "PUT",
        dataType: "xml",
        processData: false,
        contentType: false,
        data: blob,
        headers: {
            "x-amz-date": date,
            "Content-MD5": contentMD5,
            "Authorization": authorization
        },
        xhr: function() {
            var xhr = jQuery.ajaxSettings.xhr();
            if(xhr instanceof window.XMLHttpRequest) {
                xhr.upload.addEventListener("progress", progressHandler, false);
            }
            return xhr;
        },
        success: function(_, _, jqXHR) {
            console.log("sendChunkS3 success");
            var etag = jqXHR.getResponseHeader("ETag");
            me.etags[fileNo][chunkId] = etag;
            if(Object.keys(me.etags[fileNo]).length === me.numFileChunk[fileNo]) {
                me.completeFileServer(fparams);
            }
        },
        error: function() {
            console.log("sendChunkS3 error");
            me.sendChunkServer(prevParams);
        }
    });
}

S3MultipartUploader.prototype.completeFileServer = function(fparams) {
    console.log("inside completeFileServer");
    var me = this;
    var fileNo = fparams.fileNo;
    var file = me.files[fileNo];
    var uploadId = fparams.uploadId;

    var url = fparams.url;
    var date = fparams.date;
    var authorization = fparams.authorization;

    var contentType = "application/xml";
    $.get(me.serverCompleteFileUrl, 
        {
            "objectName": file.name,
            "uploadId": uploadId,
            "contentType": contentType
        }
    ).done(function(params) {
        console.log("completeFileServer done");
        params.contentType = contentType;
        me.completeFileS3(merge(fparams, params), fparams);
    }).fail(function(params) {
        console.log("completeFileServer fail");
        me.sendChunkServer(fparams);
    });
}

S3MultipartUploader.prototype.completeFileS3 = function(fparams, prevParams) {
    console.log("inside completeFileS3");
    var me = this;
    var fileNo = fparams.fileNo;
    var contentType = fparams.contentType;

    var url = fparams.url;
    var date = fparams.date;
    var authorization = fparams.authorization;

    var body = "<CompleteMultipartUpload>";
    for(var chunkNo = 1; chunkNo <= me.numFileChunk[fileNo]; chunkNo++) {
        body += "<Part>";
        body +=     "<PartNumber>";
        body +=         chunkNo
        body +=     "</PartNumber>";
        body +=     "<ETag>";
        body +=         me.etags[fileNo][chunkNo]
        body +=     "</ETag>";
        body += "</Part>";
    }
    body += "</CompleteMultipartUpload>";

    $.ajax({
        url: url, 
        type: "POST",
        dataType: "xml",
        processData: false,
        contentType: false,
        headers: {
            "Content-Type": contentType,
            "x-amz-date": date,
            "Authorization": authorization
        },
        data: body,
        success: function(result) {
            var completed = $(result).find("Error").length === 0;
            if(completed) {
                console.log("completeFileS3 success");
                console.log(result);
                me.filesDone.push(fileNo);
                if (me.filesDone.length == me.files.length) {
                    me.onDone();
                }
            }
            else {
                console.log("completeFileS3 error1");
                me.completeFileServer(prevParams);
            }
        },
        error: function() {
            console.log("completeFileS3 error2");
            me.completeFileServer(prevParams);
        }
    });
}


// Utility functions

// Call with .call(this)
function getLoadedSize() {
    var total = 0;
    for(var i in this.progress) {
        total += this.progress[i];
    }
    return total;
}

// Call with .call(this)
function getTotalSize() {
    var total = 0;
    for(var i in this.files) {
        total += this.files[i].size;
    }
    return total;
}

function merge(obj1, obj2) {
    return $.extend({}, obj1, obj2);
}


return S3MultipartUploader;
})();
