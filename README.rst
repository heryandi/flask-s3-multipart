==================
flask-s3-multipart
==================

This is a sample project to demonstrate how to upload directly to Amazon S3 via CORS using Flask making use of the multipart upload REST API.

The uploaded file will be chunked and sent to S3 concurrently. Every failed Ajax request will be retried until successful.

Using
=====

- Make sure the permission and CORS configuration of your S3 bucket are set properly.

- Fill in these values in app.py:

  * AWS_ACCESS_KEY_ID

  * AWS_SECRET_KEY

  * S3_BUCKET_NAME

- Run app.py as usual.

    python app.py

Sample CORS Configuration
=========================

Put this as your CORS configuration::

    <?xml version="1.0" encoding="UTF-8"?>
    <CORSConfiguration xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
        <CORSRule>
            <AllowedOrigin>*</AllowedOrigin>
            <AllowedMethod>GET</AllowedMethod>
            <AllowedMethod>POST</AllowedMethod>
            <AllowedMethod>PUT</AllowedMethod>
            <MaxAgeSeconds>3000</MaxAgeSeconds>
            <ExposeHeader>ETag</ExposeHeader>
            <AllowedHeader>*</AllowedHeader>
            <AllowedHeader>Access-Control-Expose-Headers</AllowedHeader>
        </CORSRule>
    </CORSConfiguration>

Sample Bucket Policy
====================

Sample bucket policy to make enable everyone to download objects from the bucket::

    {
        "Version": "2008-10-17",
        "Id": "Policy1378976564974",
        "Statement": [
            {
                "Sid": "Stmt1378976561483",
                "Effect": "Allow",
                "Principal": {
                    "AWS": "*"
                },
                "Action": "s3:GetObject",
                "Resource": "arn:aws:s3:::your-bucket-name/\*"
            }
        ]
    }

Useful Docs
===========

`Amazon: Multipart Upload Overview <http://docs.aws.amazon.com/AmazonS3/latest/dev/mpuoverview.html>`_

`Amazon: API Support for Multipart Upload <http://docs.aws.amazon.com/AmazonS3/latest/dev/sdksupportformpu.html>`_

`Amazon: Signing and Authenticating REST Requests <http://docs.aws.amazon.com/AmazonS3/latest/dev/RESTAuthentication.html>`_

`Amazon: Enabling Cross-Origin Resource Sharing <http://docs.aws.amazon.com/AmazonS3/latest/dev/cors.html>`_

Useful References
=================

`mule-uploader <https://github.com/cinely/mule-uploader>`_

`s3-multipart <https://github.com/maxgillett/s3_multipart>`_
