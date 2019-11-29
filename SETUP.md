# Setup!

#### Setting up your own Body Area Network!

1. LogIn into your Root AWS Console.
2. Create a IAM Policy
   - Click on services -> IAM -> Policies -> Create Policy
   - Click on `JSON` tab
   - and copy the JSON present [here](iot/policy/sensor-policy.json)
   - click on `Review Policy` for name use `scalable-policy` (or anything else, here I will be sticking to this one - make sure to stay consistenct)
   - click on `Create Policy`.
3. Create an IAM user and attach a policy to the user.
   - Click on services -> IAM -> Users -> Add User.
   - in the username box enter `scalable-user` (or anything else, here I will be sticking to this one - make sure to stay consistenct)
   - For Access type, select AWS Console access.
   - For Console password, choose Custom password. Note the password. 
   - Remove the check mark next to User must create a new password at next sign-in. 
   - Click Next: Permissions. 
   - In the Set permissions section, click Attach existing policies directly and search for `scalable-policy`
   - click next for Tags and Review and then click `Create User`.
   - Note the **sign-in URL** -> click on it and log in as `scalable-user`.
4. Create an AWS Cloud9 environment
   - Click on services -> Cloud9 -> Create Environment -> give it any name
   - leave default settings -> review and create a new environment.
5. BAN Initial setup.
   - Install the AWS IoT Device SDK Node package by running the following command in your AWS Cloud9 terminal
     - `npm install aws-iot-device-sdk`
   - Now clone this repo into the environment
     - `git clone https://github.com/mukeshmk/ban-on-awscloud9.git`
   - move the file from the `ban-on-awscloud9` dir into the `root-dir`.
 6. Now that the code for your BAN is there in place, we need to let aws-iot know there these devices present
    - now cd into any sensor say `body-temperature-sensor` like this `cd ~/environment/body-temperature-sensor`
    - and run the follow command `aws iot create-thing --thing-name body-temperature-sensor`.
    - now create certificates and private keys as below
      - `aws iot create-keys-and-certificate --set-as-active --certificate-pem-outfile certificate.pem.crt --private-key-outfile private.pem.key`
    - To attach the Policy to the Certificate, enter the following command. Replace `changeme` with the value of the attribute certificateArn from the output of the previous command.
      - `aws iot attach-policy --policy-name scalable-policy --target changeme`
 7. Now we have set up one sensor in our body area network, you should now be able to run the sensor.
    - To run the sensor, execute `node body-temperature-sensor.js` from the terminal.
    - Repeat step six for the remaining sensors and you are set to go!
    - For further details about how to setup refer the edX course [AWS IoT: Developing and Deploying an Internet of Things](
https://www.edx.org/course/aws-iot-developing-and-deploying-an-internet-of-things).