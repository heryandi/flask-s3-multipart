from datetime import datetime, timedelta
import base64
import hmac, hashlib
import time

from flask import Flask, json, jsonify, render_template, request

AWS_ACCESS_KEY_ID = ""
AWS_SECRET_KEY = ""
S3_BUCKET_NAME = ""
S3_BUCKET_URL = "//" + S3_BUCKET_NAME + ".s3.amazonaws.com" 

app = Flask(__name__)

@app.route("/", methods=["GET"])
def index():
    return render_template("index.html", AWS_ACCESS_KEY_ID = AWS_ACCESS_KEY_ID, S3_BUCKET_NAME = S3_BUCKET_NAME, S3_BUCKET_URL = S3_BUCKET_URL)

@app.route("/init_multipart", methods=["GET"])
def init_multipart():
    objectName = encodeURI(request.args.get("objectName"))

    url = "//{bucketName}.s3.amazonaws.com/{objectName}?uploads".format(
        bucketName=S3_BUCKET_NAME,
        objectName=objectName
    )
    date = curdatetime()

    string = "POST\n\n\n\nx-amz-date:{date}\n/{bucketName}/{objectName}?uploads".format(
        date=date,
        bucketName=S3_BUCKET_NAME,
        objectName=objectName
    )
    signature = sign_string(string)
    authorization = "AWS " + AWS_ACCESS_KEY_ID + ":" + signature

    return jsonify({
        "url": url,
        "date": date,
        "authorization": authorization
    })

@app.route("/send_chunk", methods=["GET"])
def send_chunk():
    objectName = encodeURI(request.args.get("objectName"))
    partNumber = request.args.get("partNumber")
    uploadId = request.args.get("uploadId")
    contentMD5 = request.args.get("contentMD5")

    url = "//{bucketName}.s3.amazonaws.com/{objectName}?partNumber={partNumber}&uploadId={uploadId}".format(
        bucketName=S3_BUCKET_NAME,
        objectName=objectName,
        partNumber= partNumber,
        uploadId= uploadId
    )
    date = curdatetime()

    string = "PUT\n{contentMD5}\n\n\nx-amz-date:{date}\n/{bucketName}/{objectName}?partNumber={partNumber}&uploadId={uploadId}".format(
        contentMD5=contentMD5,
        date=date,
        bucketName=S3_BUCKET_NAME,
        objectName=objectName,
        partNumber=partNumber,
        uploadId=uploadId
    )
    signature = sign_string(string)
    authorization = "AWS " + AWS_ACCESS_KEY_ID + ":" + signature

    return jsonify({
        "url": url,
        "date": date,
        "authorization": authorization
    })

@app.route("/complete_file", methods=["GET"])
def complete_file():
    objectName = encodeURI(request.args.get("objectName"))
    uploadId = request.args.get("uploadId")
    contentType = request.args.get("contentType")

    url = "//{bucketName}.s3.amazonaws.com/{objectName}?uploadId={uploadId}".format(
        bucketName=S3_BUCKET_NAME,
        objectName=objectName,
        uploadId=uploadId
    )
    date = curdatetime()

    string = "POST\n\n{contentType}\n\nx-amz-date:{date}\n/{bucketName}/{objectName}?uploadId={uploadId}".format(
        contentType=contentType,
        date=date, 
        bucketName=S3_BUCKET_NAME,
        objectName=objectName,
        uploadId=uploadId
    )
    signature = sign_string(string)
    authorization = "AWS " + AWS_ACCESS_KEY_ID + ":" + signature

    return jsonify({
        "url": url,
        "date": date,
        "authorization": authorization
    })

# Mimic javascript encodeURI() function
def encodeURI(str):
    try:
        from urllib import quote
    except ImportError:
        from urllib.parse import quote
    return quote(str, ";,/?:@&=+$!~*'()")

def curdatetime():
    return time.strftime("%a, %d %b %Y %H:%M:%S %Z", time.localtime()).strip()

def sign_string(string):
    return base64.b64encode(hmac.new(AWS_SECRET_KEY, string, hashlib.sha1).digest())

if __name__ == "__main__":
    app.run(debug=True)
