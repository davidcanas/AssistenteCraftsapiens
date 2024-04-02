FROM node:18.16.1-alpine

RUN mkdir -p /usr/assistentecraftsapiens
WORKDIR /usr/assistentecraftsapiens

COPY package.json /usr/assistentecraftsapiens
COPY tsconfig.json /usr/assistentecraftsapiens
COPY . /usr/assistentecraftsapiens
RUN yarn 
RUN yarn tsc


CMD ["node", "--expose-gc", "./dist/main.js"]
