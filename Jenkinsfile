pipeline {
  agent any
 
  tools {nodejs "node"}
 
 stages {
    stage('Setup parameters') {
      steps {
        script { 
          properties(
            [
              parameters(
                [
                  booleanParam(
                    defaultValue: true, 
                    description: 'Publish to npm', 
                    name: 'PUBLISH_TO_NPM'
                  )
                ]
              )
            ]
          )
        }
      }
    }
    stage('Install dependencies') {
      steps {
        sh 'npm install'
      }
    }
    stage('Test') {
      steps {
         sh 'npm test'
      }
    } 
    stage('Publish') {
      when {
        expression { 
          return params.PUBLISH_TO_NPM
        }
      }
      steps {
         sh 'npm publish'
      }
    }     
  }
}
