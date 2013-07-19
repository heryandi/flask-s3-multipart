========
flask-s3
========

This is a sample project to demonstrate how to upload directly to Amazon S3 via CORS using Flask.

`jQuery-File-Upload <https://github.com/blueimp/jQuery-File-Upload>`_ is used to help as well.

Using
=====

- Make sure the permission and CORS configuration of your S3 bucket are set properly.

- Fill in these values in app.py:

  * AWS_ACCESS_KEY_ID

  * AWS_SECRET_KEY

  * S3_BUCKET_NAME

- Run app.py as usual.

    python app.py


Useful Docs
===========

`Amazon: Browser Uploads to S3 using HTML POST Forms <http://aws.amazon.com/articles/1434>`_

`Amazon: Enabling Cross-Origin Resource Sharing <http://docs.aws.amazon.com/AmazonS3/latest/dev/cors.html>`_

`jQuery-File-Upload: Upload directly to S3 <https://github.com/blueimp/jQuery-File-Upload/wiki/Upload-directly-to-S3>`_
