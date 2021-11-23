# Development Notes from Sighthound

This web application demo displays objects detected by a Sighthound video analytics pipeline.  
* The UI displays photos of objects found.
* When a vehicle is found which includes a license plate and license plate string is resolved, the vehicle is displayed with an inset of the license plate string.
* The selected vehicle or person is shown in the middle top part of the screen, while all vehicles/people found will show in a grid in the lower part of the screen.
* You can change the selected vehicle/person by clicking on its photo in the lower grid.
* Check the "Specify Sever" button to specify the server device running SIO software.  This can be used to specify the hostname or IP address of a DNN Node device
running sighthound analytics.
  * When connected to the server, the "Connected" status icon should turn green.
* Click the "Show Results" button to show or save a list of CSV data captured by the application.

## Running the Container

First, follow the instructions to start and configure the Sighthound Analytics application in your deployment.  Note the server IP address or hostname.

Ensure you have Docker installed for your host (currently Intel Linux docker configurations, including Windows Subsystem for Linux, are supported).

Next, using command
```
./runDocker.sh
```
* Point your browser to http://localhost:3000 (or the location where you deployed this container).
* Specify the server address as the Sighthound Analytics application in the top of the window.

## Building the container for this UI

To build this UI into a docker image, run:
```
$ ./buildDocker.sh
```
Follow the instructions to tag your local image, or customize the [runDocker.sh](runDocker.sh) script accordingly.

## Ports

These ports are used and need to stay open:  
* 80 - Used by the web UI application
* 4000 - used by the UI to access images on the media server  
* 5672 - used by RabbitMQ for its AMQP traffic  
* 15674 - used by RabbitMQ to send AMQP traffic to the UI
