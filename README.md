# Development Notes from Sighthound

This demo takes in one or more (up to 10) camera inputs as RTSP streams and identifies cars, license plates and people. The UI will show a photo of a vehicle found with an inset of the license plate string (that is, once the license plate string is resolved; prior to that time, the string will read 'unknown'). The selected vehicle or person is shown in the middle top part of the screen, while all vehicles/people found will show in a grid in the lower part of the screen. Change the selected vehicle/person by clicking on its photo in the lower grid.

**The pieces of the overall demo application are:**  
**SIO pipeline** - processes camera inputs and outputs to an AMQP bus; one pipeline is used per RTSP stream  
**RabbitMQ** - receives AMQP bus traffic and routes messages to the UI via a websocket interface  
**Media server** - small Node.js server to receive requests for image files and return those files  
**Proxy server** - small Node.js server to redirect UI and backend requests to the right server
**User Interface** - (this application) UI code that runs in a browser

All parts of the application will run in their own docker containers.

## Building the container for this UI

To build this UI into a docker image, run:  
$ cd /home/root
$ cd ext-alpr-mobile-demo
$ ./buildDocker.sh

The other containers will be built as part of their own projects and so won't require building here.


## Starting/stopping the docker containers

To start the docker containers using one script:  
$ cd /data/config/ext-edge-analytics
$ docker-compose up -d

To test locally when the server is deepstream-gpu (or an equivalent machine that we can't VPN into), you'll need to port forward a few ports, like port 80 to 4000 locally:  
$ gcloud --project baidev compute ssh deepstream-gpu -- -NL 15674:localhost:15674 -NL 4000:localhost:80

Then you can access the UI at <code>localhost:4000</code>.

<code>ip-address</code> below is either <code>localhost:4000</code> or if you have VPN access to the machine, it will just be that machines IP address.

To test locally when the code is running locally, use <code>localhost:3000</code>.

To verify that things are working:  
- Do <code>docker-compose up -d</code> as described above.  
- Open a browser window to <code>ip-address</code> - this should show results from the various cameras.
- In a terminal window, type: curl http://ip-address/api/ping - this should return the string "OK".
- In a browser window, type: http://ip-address/api/api-docs - this should show the API documentation page.

To stop the docker containers after starting with docker-compose:  
$ docker-compose down


# More information on this UI codebase, which was created with Create React App

What follows is boilerplate from the Create React App installation:

## Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `yarn start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `yarn test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `yarn build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `yarn eject`

**Note: this is a one-way operation. Once you `eject`, you can’t go back!**

If you aren’t satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you’re on your own.

You don’t have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn’t feel obligated to use this feature. However we understand that this tool wouldn’t be useful if you couldn’t customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `yarn build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
