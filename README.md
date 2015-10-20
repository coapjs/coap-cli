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
    -V, --version            output the version number
    -o, --observe            Observe the given resource
    -n, --no-new-line        No new line at the end of the stream
    -p, --payload <payload>  The payload for POST and PUT requests
    -q, --quiet              Do not print status codes of received packets
    -c, --non-confirmable    non-confirmable
```

### PUT and POST

__PUT__ and __POST__ requests body are sent from the standard
input by default. E.g.
```
echo -n 'hello world' | coap post coap://localhost/message
```

If you want to type it you can end the standard input by pressing
CTRL-D.

License
----------------------------

Copyright (c) 2013 Matteo Collina

node-coap is licensed under an MIT +no-false-attribs license.
All rights not explicitly granted in the MIT license are reserved.
See the included LICENSE file for more details.
