CoAP-CLI
============================

[![Build
Status](https://travis-ci.org/mcollina/coap-cli.png)](https://travis-ci.org/mcollina/coap-cli)

__CoAP-CLI__ is a command line interface for CoAP, built on node.js and
[node-coap](http://github.com/mcollina/node-coap).

What is CoAP?
----------------------------

> Constrained Application Protocol (CoAP) is a software protocol
intended to be used in very simple electronics devices that allows them
to communicate interactively over the Internet. -  Wikipedia

Install
----------------------------

Install [node.js](http://nodejs.org), and then from a terminal:
```
npm install coap-cli -g
```

Usage
----------------------------

```
  Usage: coap [command] [options] url

  Commands:

    get                    performs a GET request
    put                    performs a PUT request
    post                   performs a POST request
    delete                 performs a DELETE request

  Options:

    -h, --help               output usage information
    -H, --headers <headers>  The headers string for requests
    -V, --version            output the version number
    -o, --observe            Observe the given resource
    -n, --no-new-line        No new line at the end of the stream
    -p, --payload <payload>  The payload for POST and PUT requests
    -q, --quiet              Do not print status codes of received packets
```

### PUT and POST

__PUT__ and __POST__ requests body are sent from the standard
input by default. E.g.
```
echo -n 'hello world' | coap post coap://localhost/message
```

If you want to type it you can end the standard input by pressing
CTRL-D.

### Sending authentication headers for Meshblu (formerly SkyNet.im)

Meshblu uses skynet_auth_uuid and skynet_auth_token authentication headers in all HTTP and CoAP API calls. You can test Meshblu CoAP API calls by adding: 

-H "skynet_auth_uuid={:UUID}&skynet_auth_token={:TOKEN}" to your CoAP CLI call like this:

coap post -p "payload=hi&devices=9314f1d1-2404-11e4-a3a9-9b953437ccb1" -H "skynet_auth_uuid=9fb3cb71-23e9-11e4-a870-9f04ce09bb6b&skynet_auth_token=9fv55f6hi0iicnmii8k4rrs4t4g9cnmi" coap://coap.meshblu.com/messages

License
----------------------------

Copyright (c) 2013 Matteo Collina

node-coap is licensed under an MIT +no-false-attribs license.
All rights not explicitly granted in the MIT license are reserved.
See the included LICENSE file for more details.
