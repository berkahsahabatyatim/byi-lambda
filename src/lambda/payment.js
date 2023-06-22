import { google } from 'googleapis'
import fetch from 'node-fetch'

const { NEXT_PUBLIC_EMAIL, NEXT_PUBLIC_PPK } = process.env
const scopes = [
  'https://www.googleapis.com/auth/datastore'
]

// Authenticate a JWT client with the service account.
const jwtClient = new google.auth.JWT(
  NEXT_PUBLIC_EMAIL,
  null,
  NEXT_PUBLIC_PPK,
  scopes
)

export function handler(event, context, callback) {
  console.log(`apa ini ${NEXT_PUBLIC_EMAIL} ${NEXT_PUBLIC_PPK}`)
  const res = JSON.parse(event.body)
  jwtClient.authorize(async function (error, tokens) {
    if (error) {
      callback(null, {
        statusCode: 500,
        body: `unable generate token ${error}`
      })
    } else if (tokens.access_token === null) {
      console.log('Provided service account does not have permission to generate access tokens')
      callback(null, {
        statusCode: 401,
        body: 'error access token null'
      })
    } else {
      const accessToken = tokens.access_token
      console.log("dapet ya?", accessToken)
      console.log(`ini body nya ${res.custom_field3}`)
      var body = {}
      var campaignId = ""
      try {
        const cust = JSON.parse(res.custom_field3)
        campaignId = cust.campaignId
        body = {
          "fields": {
            "name": {
              "stringValue": cust.name
            },
            "phone": {
              "stringValue": cust.phone
            },
            "isAnonym": {
              "booleanValue": cust.isAnonym
            },
            "amount": {
              "integerValue": cust.amount
            },
            "message": {
              "stringValue": cust.message
            }
          }
        }
      } catch (e) {
        callback(null, {
          statusCode: 500,
          body: `error parse ${e}`
        })
      }
      fetch(`https://firestore.googleapis.com/v1/projects/cipcipp-150996/databases/(default)/documents/${campaignId}?documentId=${res.transaction_id}`, {
        body: JSON.stringify(body),
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        method: 'POST'
      })
        .then(response => response.json())
        .then(data => {
          callback(null, {
            statusCode: 200,
            body: `${data}`
          })
        })
        .catch((e) => {
          callback(null, {
            statusCode: 400,
            body: `error ${e}`
          })
        })
    }
  })
}