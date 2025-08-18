# Jenkins in Production: A Hands-On CI/CD Workshop

# Section 1: Core CI/CD Concepts

This workshop dives into building a Continuous Integration/Continuous Deployment (CI/CD) pipeline with Jenkins. The goal of CI/CD is to automate the software delivery process, making it faster, safer, and more predictable. This automation helps bridge the gap between development and operations, catching bugs early and ensuring that code is always in a releasable state.

Here are the fundamental concepts we will be working with:

*   **Continuous Integration (CI):** The practice of frequently merging developer code changes into a central repository. Each merge triggers an automated build and test run, providing rapid feedback and preventing integration issues. Our primary goal in this workshop is to build a robust CI pipeline.

*   **Continuous Delivery (CDelivery):** An extension of CI where every code change that passes the automated tests is automatically packaged and prepared for release. The final deployment to production is a manual, push-button decision, giving teams control over the release timing.

*   **Continuous Deployment (CDeployment):** The most advanced form of automation, where every change that passes all tests is automatically deployed to production without human intervention. This requires a very high level of confidence in the automated test suite.

*   **Pipeline as Code:** The practice of defining the entire CI/CD workflow in a text file (a `Jenkinsfile.ci`) that is stored and versioned alongside the application's source code. This provides auditability, collaboration, and reusability.

*   **Jenkins:** A powerful, open-source automation server that acts as the central engine for our CI/CD pipeline. Its extensibility through plugins and its support for Pipeline as Code make it a cornerstone of modern DevOps.

# Section 2: Workshop Environment Preparation

## 2.1 System Requirements & Prerequisite Tools

This workshop is designed to be run on a local machine or a cloud VM.

**Minimum Hardware Requirements:**
-   **RAM:** 4 GB
-   **CPU:** 2 cores
-   **Disk Space:** 20 GB of free space

**Software Requirements:**
-   **Operating System:** A recent 64-bit Debian-based Linux distribution (e.g., Debian 12 or Ubuntu 22.04/24.04).
-   **User Privileges:** A user account with `sudo` privileges.
-   **GitHub Account:** A personal GitHub account.

| Tool          | Recommended Version | Role in Workshop                                                     |
| :------------ | :------------------ | :------------------------------------------------------------------- |
| Git           | Latest stable       | Source Code Management (SCM) for our application code and Jenkinsfile. |
| Node.js & npm | 18.x (LTS)          | JavaScript runtime and package manager for our application and tests.  |
| Java (JRE)    | 17 or 21            | The runtime environment required to execute the Jenkins server.      |
| Docker Engine | Latest stable       | The platform for running containerized stages in our pipeline.       |

## 2.2 Step-by-Step Installation Guide

### 2.2.1 Installing Git, cURL, and Java
First, install the basic utilities and the Java Runtime Environment for Jenkins.

```bash
sudo apt-get update
sudo apt-get install -y git curl openjdk-17-jre
```

### 2.2.2 Installing Node.js and npm
We will use the official NodeSource repository to install a modern version of Node.js.

```bash
# Download and execute the NodeSource setup script for Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# Install Node.js and npm
sudo apt-get install -y nodejs
```

### 2.2.3 Installing Docker Engine
We will install Docker from its official `apt` repository.

```bash
# Add Docker's official GPG key
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

# Add the Docker repository to Apt sources
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update

# Install Docker Engine
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

**Configure Docker User Permissions:**
Add your user to the `docker` group to run Docker commands without `sudo`.

```bash
sudo usermod -aG docker $USER
```
> **IMPORTANT:** You must log out and log back in for this change to take effect. You can also run `newgrp docker` in your terminal to start a new shell with the correct permissions.

### 2.2.4 Installing Jenkins
We will install the Long-Term Support (LTS) version of Jenkins from its official repository.

```bash
# Add the Jenkins repository key
sudo wget -O /etc/apt/keyrings/jenkins-keyring.asc https://pkg.jenkins.io/debian-stable/jenkins.io-2023.key

# Add the Jenkins repository to the system
echo "deb [signed-by=/etc/apt/keyrings/jenkins-keyring.asc]" \
    https://pkg.jenkins.io/debian-stable binary/ | sudo tee \
    /etc/apt/sources.list.d/jenkins.list > /dev/null

# Install Jenkins
sudo apt-get update
sudo apt-get install jenkins -y
```

### 2.2.5 Final Configuration Steps
1.  **Grant Jenkins Docker Permissions:** Allow the `jenkins` user to run Docker commands.
    ```bash
    sudo usermod -aG docker jenkins
    ```
    **This is a critical step.** You must restart Jenkins for this permission to apply:
    ```bash
    sudo systemctl restart jenkins
    ```

2.  **Initial Jenkins Setup:**
    -   Navigate to `http://YOUR_SERVER_IP:8080`.
    -   Retrieve the initial admin password:
        ```bash
        sudo cat /var/lib/jenkins/secrets/initialAdminPassword
        ```
    -   Paste the password, click "Install suggested plugins", and create your own admin user when prompted.

### 2.2.6 Installing Essential Jenkins Plugins
While the "Install suggested plugins" option provides a great baseline, our pipeline requires a few more specialized plugins to enable modern CI/CD practices like containerization.

1.  **Navigate to Plugin Manager:**
    -   On the Jenkins dashboard, go to **Manage Jenkins > Plugins**.
2.  **Install the Plugin:**
    -   Select the **Available plugins** tab.
    -   In the search box, type `Docker Pipeline` and check the box next to it.
    -   Serach for `Discard Old Builds` and check the box next to it.
    -   Click the **Install** button at the bottom of the page.
3.  **Restart Jenkins:**
    -   After the installation is complete, it's a good practice to restart Jenkins to ensure the new plugin is loaded correctly. You can do this by checking the "Restart Jenkins when installation is complete and no jobs are running" box during installation, or by running `sudo systemctl restart jenkins` again.

By installing this plugin, you extend Jenkins's capabilities to understand the `docker` agent syntax in your `Jenkinsfile.ci`, resolving the pipeline error.

## 2.3 Securing Your Jenkins Instance
For this workshop, the default security settings are sufficient. However, in a production environment, you should always configure a granular authorization strategy (like Matrix-based security) and integrate with a corporate identity provider (like LDAP or SAML).

# Section 3: The Pull Request Validation Pipeline

Our goal is to create a pipeline that automatically tests incoming pull requests. This provides fast feedback to developers and protects the `main` branch from broken code.

## 3.1 Workshop Project Setup
We will use a simple Node.js application with a testing framework already configured.

1.  **Create a GitHub Repository:**
    -   Go to your GitHub account and create a new public repository. Name it `jenkins-workshop-app`.

2.  **Clone the Repository and Create the Application Files:**
    -   On your local machine, clone the empty repository:
        ```bash
        git clone https://github.com/YOUR_USERNAME/jenkins-workshop-app.git
        cd jenkins-workshop-app
        ```
    -   Create the following files inside the directory.

    `app.js`:
    ```javascript
    const express = require('express');
    const app = express();

    app.get('/', (req, res) => {
      res.send('Hello, CI/CD World!');
    });

    module.exports = app;
    ```

    `server.js`:
    ```javascript
    const app = require('./app');
    const port = 3000;

    app.listen(port, () => {
      console.log(`App listening at http://localhost:${port}`);
    });
    ```

    `package.json`:
    ```json
    {
      "name": "jenkins-workshop-app",
      "version": "1.0.0",
      "description": "A simple Node.js app for the Jenkins workshop.",
      "main": "app.js",
      "scripts": {
        "start": "node server.js",
        "test": "jest"
      },
      "dependencies": {
        "express": "^4.17.1"
      },
      "devDependencies": {
        "jest": "^29.0.0",
        "supertest": "^6.0.0"
      }
    }
    ```

    `app.test.js`:
    ```javascript
    const request = require('supertest');
    const app = require('./app');

    describe('GET /', () => {
      it('should respond with "Hello, CI/CD World!"', async () => {
        const response = await request(app).get('/');
        expect(response.statusCode).toBe(200);
        expect(response.text).toBe('Hello, CI/CD World!');
      });
    });
    ```

    `.gitignore`:
    ```
    node_modules
    ```

3.  **Install Dependencies and Run Tests Locally:**
    Verify the application works on your machine.
    ```bash
    npm install
    npm test
    ```
    You should see the test pass successfully.

4.  **Create the Initial `Jenkinsfile.ci`:**
    This first version of the `Jenkinsfile.ci` will simply check out the code. This allows us to confirm the Jenkins and GitHub integration is working before adding the testing logic.

    `Jenkinsfile.ci`:
    ```groovy
pipeline {
    agent any
    stages {
        stage('Checkout') {
            steps {
                echo "Checking out code..."
                checkout scm
            }
        }
    }
}
    ```

A `Jenkinsfile` is a text file that contains the definition of a Jenkins Pipeline and is checked into source control. This is the concept of **Pipeline as Code**; it allows you to treat your CI/CD workflow as a part of your application that can be versioned, reviewed, and iterated upon.

Let's break down the anatomy of our initial `Jenkinsfile.ci`:

*   `pipeline { ... }`: This is the main block that encloses the entire pipeline definition. It's the required top-level block for a Declarative Pipeline.

*   `agent any`: This directive tells Jenkins where to execute the pipeline (or a specific stage). `agent any` means the pipeline can run on any available Jenkins agent. An agent is a machine (or container) that is part of the Jenkins installation and is capable of running jobs. For our setup, this will be the main Jenkins controller itself.

*   `stages { ... }`: This block contains the sequence of one or more `stage` directives. The stages are the main segments of your pipeline. They are used to visualize the pipeline's progress and status in the Jenkins UI.

*   `stage('Checkout') { ... }`: This defines a single stage named "Checkout". The name is used for display in the UI. Each `stage` block must contain a `steps` block.

*   `steps { ... }`: This block defines the actual commands to be executed within a stage.

*   `echo "Checking out code..."`: This is a simple step that prints the given message to the console log of the build. It's useful for debugging and adding clarity to the build process.

*   `checkout scm`: This is a crucial step that instructs Jenkins to check out the source code from the Source Code Management (SCM) system that was configured in the Multibranch Pipeline job settings (in our case, GitHub). `scm` is a special variable that holds the SCM configuration.

This structure forms the backbone of every Declarative Pipeline. We will build upon this foundation by adding more stages to test our application.

5.  **Commit and Push:**
    Add all the new files to Git and push them to your `main` branch.
    ```bash
    git add .
    git commit -m "Initial project setup"
    git push origin main
    ```

## 3.2 Creating the Multibranch Pipeline Job in Jenkins
A Multibranch Pipeline job is the ideal choice for a PR-based workflow. Jenkins will automatically discover branches and pull requests in your repository and create jobs for them.

1.  **Store GitHub Credentials in Jenkins:**
    -   Create a GitHub Personal Access Token (PAT) with the `repo` scope.
    -   In Jenkins, go to **Manage Jenkins > Credentials > (global)**.
    -   Click **Add Credentials**.
    -   **Kind:** `Username with password`.
    -   **Username:** Your GitHub username.
    -   **Password:** Your GitHub PAT.
    -   **ID:** `github-scm-credentials`.
    -   Click **Create**.

2.  **Create the Job:**
    -   On the Jenkins dashboard, click **New Item**.
    -   Enter a name (e.g., `jenkins-workshop-app-ci`) and select **Multibranch Pipeline**. Click **OK**.
    -   Under **Branch Sources**, click **Add source** and select **GitHub**.
    -   **Credentials:** Select the `github-scm-credentials` you just created.
    -   **Repository HTTPS URL:** Enter your repository's URL.
    -   For **Discover branches**, select **Exclude branches that are also filed as PRs**.
    -   For **Discover pull requests from origin**, select **Merging the pull request with the current target branch revision**.
    -   For **Discover pull requests from forks**, select **Merging the pull request with the current target branch revision**.
    -   Add the behaviour **Filter by name (with wildcards)**, and include the branch `PR-*`.
    -   Under **Build Configuration**, select **By Jenkinsfile** and the Script Path as `Jenkinsfile.ci`.
    -   Under **Discard Old Builds**, check the box and set the following:
        -   **Max # of builds to keep:** 10
    -   Click **Save**.

Jenkins will now scan your repository, find the `main` branch, and run the pipeline for the first time. You should see a successful build with only a "Checkout" stage.

# Section 4: Automating Tests in a Clean Environment

Hard-coding test execution directly on a Jenkins agent is brittle. The agent might not have the correct version of Node.js, or it might have conflicting global packages. The modern, reliable solution is to run every stage in a clean, defined environment using a Docker container.

## 4.1 The Containerized Test Stage
We will now update our `Jenkinsfile.ci` to run our `npm test` command inside a `node` container.

**Update your `Jenkinsfile.ci`:**
```groovy
pipeline {
    // Define a global agent 'none' to enforce per-stage agent definitions
    agent none

    options {
        // Set a global timeout for the entire pipeline to prevent it from running indefinitely.
        timeout(time: 30, unit: 'MINUTES')
    }

    stages {
        stage('Checkout') {
            // This stage can run on any available agent
            agent any
            options {
                // Set a timeout for this stage to prevent it from hanging.
                timeout(time: 5, unit: 'MINUTES')
            }
            steps {
                echo "Checking out code..."
                checkout scm
            }
        }

        stage('Run Tests') {
            // Define a specific agent for this stage
            agent {
                // Use the Docker Pipeline plugin to spin up a temporary container
                docker {
                    image 'node:18-alpine'
                    // Set the HOME env var to the workspace to fix npm permissions
                    args '-e HOME=${WORKSPACE}'
                }
            }
            options {
                // Set a timeout for this stage to prevent it from hanging.
                timeout(time: 10, unit: 'MINUTES')
            }
            steps {
                echo 'Running tests inside a Docker container...'
                // These shell commands are executed inside the node:18-alpine container
                sh '''
                    echo "Ensuring a clean environment by removing old dependencies..."
                    rm -rf node_modules
                    npm install
                    npm test
                '''
            }
        }
    }
}
```

**Understanding the Changes:**
-   `agent none`: By setting the top-level agent to `none`, we force every `stage` to declare its own execution environment. This is a best practice that makes pipelines more explicit and readable.
-   `options { timeout(...) }`: We've added timeouts at both the global and stage levels. The global `timeout` in the top-level `options` block prevents the entire pipeline from running for more than 30 minutes. The `timeout` within each `stage`'s `options` block provides more granular control, ensuring that a single stuck stage doesn't consume all the pipeline's execution time. This is a crucial best practice for creating resilient pipelines.
-   `agent { docker { image 'node:18-alpine' } }`: This is the core of containerized pipelines in Jenkins. Before the `Run Tests` stage begins, Jenkins will:
    1.  Pull the `node:18-alpine` image from Docker Hub (if not already present).
    2.  Start a new container from that image.
    3.  Check out the project source code into the container.
    4.  Execute all the `steps` within that container.
    5.  Automatically stop and remove the container when the stage is complete.
-   `sh 'npm install'` and `sh 'npm test'`: These are now executed in the pristine environment provided by the `node:18-alpine` container, ensuring consistent and repeatable test runs every single time.

## 4.2 Testing the Workflow with a Pull Request
Now, let's simulate a developer workflow.

1.  **Create a New Branch:**
    On your local machine, create and switch to a new branch.
    ```bash
    git checkout -b feature/add-new-endpoint
    ```

2.  **Make a Code Change:**
    Let's add a new test to `app.test.js` that we know will fail initially.
    ```javascript
    // Add this inside the describe block in app.test.js
    it('should respond to a new endpoint', async () => {
        const response = await request(app).get('/new');
        expect(response.statusCode).toBe(200);
        expect(response.text).toBe('Hello, New Endpoint!');
    });
    ```

3.  **Commit and Push the Branch:**
    ```bash
    git commit -am "feat: Add failing test for new endpoint"
    git push origin feature/add-new-endpoint
    ```

4.  **Create a Pull Request:**
    -   Go to your repository on GitHub. You will see a prompt to create a pull request from your new branch.
    -   Click "Create pull request". Give it a title and description.

5.  **Observe Jenkins:**
    -   Go to your Multibranch Pipeline job in Jenkins. You will see a new job has been created for your pull request.
    -   Click on the PR job. The pipeline will run, and the "Run Tests" stage will fail because our new test is failing.
    -   Back on the GitHub pull request page, you will see a red "X" next to your commit, indicating that the checks have failed. This is Jenkins reporting the status back to GitHub.

6.  **Fix the Code:**
    Now, let's implement the feature to make the test pass.
    -   Add the new endpoint to `app.js`:
        ```javascript
        // Add this before module.exports in app.js
        app.get('/new', (req, res) => {
          res.send('Hello, New Endpoint!');
        });
        ```
    -   Commit and push the fix to the same branch:
        ```bash
        git commit -am "fix: Implement new endpoint"
        git push origin feature/add-new-endpoint
        ```

7.  **Verify the Fix:**
    -   Jenkins will automatically detect the new commit and re-run the pipeline for the pull request.
    -   This time, the "Run Tests" stage should succeed.
    -   The GitHub pull request page will now show a green checkmark, signaling that the changes are tested and safe to merge.

# Section 5: Protecting the Main Branch

The final step in a professional CI workflow is to enforce these checks. A green checkmark is a good indicator, but a developer could still merge a failing pull request. We can prevent this using **branch protection rules** in GitHub.

1.  **Navigate to Branch Settings:**
    -   In your GitHub repository, go to **Settings > Branches**.
    -   Click **Add branch protection rule**.

2.  **Configure the Rule:**
    -   **Branch name pattern:** Enter `main`.
    -   **Require status checks to pass before merging:** Check this box.
        -   A search box will appear. Search for the name of your Jenkins status check. It usually looks like `Jenkins pipeline jenkins-workshop-app`. Select it.
    -   Click **Create**.

Now, GitHub will physically block the "Merge" button on any pull request targeting `main` until the Jenkins pipeline has run and reported a successful result. You have successfully created a robust quality gate for your codebase.
