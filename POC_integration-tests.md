Alright, we need to do a bunch of experimenting to figure out how to get a functional test environment.

Here's what we know so far:
- screepers/screeps-launcher is a great way to get a server up and running
  - right now we just clone and build it ourselves because the published image doesn't support arm64. Look at scripts/build-screeps-server.sh to pull out the minimal steps required for our experiments.
- It does a bunch of installation on first launch of the container, so we need to figure out a reliable way of preloading all of that state so that we don't have to rebuild it for every single test case run, but it also needs to _only_ have the preloading saved, not any game state.
- There is a console API that is only available from inside the container (port 21026). These are the two calls we know about:
  - `curl http://localhost:21026/greeting` - basic directions
  - `curl http://localhost:21026/cli -d "help()"` - do everything else
  - you can then call "help(bots)" or whatever else to get information about how to call those other objects
  - these curl commands have to be run from inside the container, like this: `finch compose -f docker-compose.test.yml exec screeps curl http://localhost:21026/cli -d "help()"`
- We need to explore the console API to figure out how to reliably control the server to behave the way we want it to.
- Once we've figure out how to get a blob of bot logic running inside the server, we need to figure out how to instrument it for testing.
- This is going to have two parts: we need to inject some kind of setup code that gets the world into the desired state for the test case. Then, we need to instrument the world with probes to get us information about how the bot code is performing so that we know if it did what we wanted it to do.
  - Bot code is just something that exports a loop() function according to the screeps specification and does stuff inside the function. We don't want any of our "testing" logic to exist inside the bot code.
  - Testing code is whatever stimulus we want to apply to the world so that our bot code gets activated in the desired way and any probes we want to set up to monitor how the bot code is behaving. This _might_ just be that we are setting up the map into a specific state, running additional console commands to set other world variables/memory state, and then letting it run. I don't know, you need to figure it out.
  - You may need to brainstorm a few functional test cases here to get an idea of the requirements; try not to get too bogged down in those test cases though; we're focusing on the proof of concept that we _can_ do this, not exactly _how_ we're going to set up test cases.
- We need to figure out how tick management works in the game. I don't think we need to single-step the server, but we probably need someway to allow pausing the simulation until everything is setup and then somehow detecting when we're "done". Timers are always an option, but it would be nice to have something event-based or at least a pollable "are we done yet" indicator, even if that just looks at "have 100 ticks passed".

You need to do a ton of experimentation here. Take notes, spin up and tear down containers, develop and test your hypothesis. Record everything you learn, what works, what doesn't work. Make a journal. As you figure out how to get components of this to work reliably, encode them into a proof of concept script of some sort.

For now, this is all a standalone proof of concept; don't worry about using anything else in the repo or integrating with it. Make your own minimal test bot code. Keep trying different things; if you get stuck, save what you know and try something completely different. I don't want you to stop until you have a functional proof of concept that allows me to see you inject a bot with no testing-specific code, distinct setup logic, and extract out signals that prove the bot did what you expected it to do.

Build yourself tools along the way for setting up and tearing down the test environment over and over. Ugly is fine, we're deep in exploration and proof of concept mode here. We'll worry about doing something with it way later on.

You can use the internet to do some research here too, though the options out there kind of suck, so don't put too much stock in them. You are the smart person in the room and will need to figure this out yourself.

Build a plan, take notes on what you're doing, share your thoughts. Keep exploring, you can do this!

----

This is awesome! Let's do some more experiments. Remember to document everything in your journal, both what works and what      │
│   doesn't. I see a lot of test files I can't tell what was used for what. The results so far are great and I don't want to lose   │
│   them. For the next ideas: I'm expecting the user bot code to be very large, can we try using some kind of file system           │
│   operation to inject the user code while the server is running and then get the server to reload it from disk? There might also  │
│   be an API in the server for pushing in user code. Another thing to try: currently, you're putting testing logic inside the      │
│   user code; can we try building a testing pattern where the user code is "clean" and then we inject testing code around it? I'm  │
│   not exactly sure what that looks like, but maybe you do the room creation/world setup as a before step and then the "testing"   │
│   code is just in the final monitoring loop where you are either counting ticks to see if we've waited long enough or you're      │
│   looking for some kind of indicator that something happened (e.g. if we are wanting to see if the harvesting works, look for an  │
│   indicator that a creep successfully deposited energy into a source?). The point is that the test code should be looking for     │
│   side effects instead of instrumenting the user code directly. Again, remember to document everything we are trying out and      │
│   guessing at and learning. You are doing a lot of work that I don't see; I only read your final notes, so they need to be        │
│   educational. We'll use everything we learn to build a report that can be used later to guide development and eventually         │
│   produce a testing framework for screeps. But for now, we are just running lots of exploratory experiments. Please go run these  │
│   experiments and any other experiments you can think of. Write everything down.

----
