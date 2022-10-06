pipeline {
  agent any
 
  tools {nodejs "node"}
 
  stages {
    stage('Install dependencies') {
      steps {
        sh 'npm install'
      }
    }
    stage('Lint') {
      steps {
        sh 'npm lint'
      }
    }
    stage('Test') {
      steps {
         sh 'npm test'
      }
    }      
  }
}
