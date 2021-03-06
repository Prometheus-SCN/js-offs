FROM ubuntu:bionic
COPY ["./dist/OFF_System_0.1.0_linux_amd64.deb", "./"]

EXPOSE 23402
EXPOSE 8200
ENV LD_LIBRARY_PATH="/usr/local/lib"
RUN apt-get update
RUN apt install libasound2 -y
RUN apt install "./OFF_System_0.1.0_linux_amd64.deb" -f -y
RUN apt-get update -y && \
    apt-get install -y libgtk2.0-0 && \
    apt-get install -y libnotify-dev && \
    apt-get install -y libgconf-2-4 && \
    apt-get install -y libnss3
ENV ELECTRON_RUN_AS_NODE="true"
ENTRYPOINT [ "offs", "/opt/offs/resources/app.asar/src/index.js", "--path", "/offs"]