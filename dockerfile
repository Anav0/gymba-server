FROM node:12

# Create app directory
WORKDIR /usr/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN npm install
# If you are building your code for production


# Bundle app source
COPY . .

# build project...
RUN npm run build

#there are no .env on server
# RUN npm ci
# COPY .env ./dist/

WORKDIR ./dist

EXPOSE 5000
CMD [ "node", "entry.js" ]
