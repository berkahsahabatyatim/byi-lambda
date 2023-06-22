import { google } from 'googleapis'
import fetch from 'node-fetch'

const { NEXT_PUBLIC_EMAIL, NEXT_PUBLIC_PPK, NEXT_PUBLIC_ISLOCAL } = process.env
const scopes = [
  'https://www.googleapis.com/auth/datastore'
]

// Authenticate a JWT client with the service account.
const jwtClient = new google.auth.JWT(
  NEXT_PUBLIC_EMAIL,
  null,
  NEXT_PUBLIC_PPK.replace(/\\n/g, '\n'),
  scopes
)

export function handler(event, context, callback) {
  print(`apa ini ${NEXT_PUBLIC_EMAIL} ${NEXT_PUBLIC_PPK.replace(/\\n/g, '\n')}`)
  const res = JSON.parse(event.body)
  jwtClient.authorize(async function (error, tokens) {
    if (error) {
      callback(null, {
        statusCode: 500,
        body: `unable generate token ${error}`
      })
    } else if (tokens.access_token === null) {
      print('Provided service account does not have permission to generate access tokens')
      callback(null, {
        statusCode: 401,
        body: 'error access token null'
      })
    } else {
      const accessToken = tokens.access_token
      print("dapet ya?", accessToken)
      print(`ini body nya ${res.custom_field3}`)
      if (res.transaction_status != "settlement") {
        callback(null, {
          statusCode: 201,
          body: `ignored`
        })
      }
      var body = {}
      var campaignId = ""
      var amount = 0
      try {
        const cust = JSON.parse(res.custom_field3)
        campaignId = cust.campaignId
        amount = cust.amount
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
      const headers = {
        'Authorization': `Bearer ${accessToken}`
      }
      const baseUrl = 'https://firestore.googleapis.com/v1/projects/cipcipp-150996/databases/(default)/documents'
      var url = `${baseUrl}/${campaignId}?documentId=${res.transaction_id}`
      addEntry(body, url, headers, callback)

      url = `${baseUrl}/${campaignId}-sum/`
      checkSum(url, headers, amount)
    }
  })
}

function checkSum(url, headers, addition) {
  fetch(url, {
    headers: headers,
    method: 'GET'
  }).then(response => response.json())
    .then((miaw) => {
      const currentSum = Number(miaw.documents[0].fields.sum.integerValue)
      const nextSum = currentSum + addition
      print(`next sum would be ${nextSum}`)
      addSum(url, headers, nextSum)
    })
}

function addSum(url, headers, nextSum) {
  fetch(`${url}sum?updateMask.fieldPaths=sum`, {
    headers: headers,
    method: 'PATCH',
    body: JSON.stringify({
      "fields": {
        "sum": {
          "integerValue": `${nextSum}`
        }
      }
    })
  }).then(response => response.json())
    .then((miaw) => {
      print(`done here`)
      // callback(null, {
      //   statusCode: 200,
      //   body: `${JSON.stringify(miaw)}`
      // })
    })
}

function addEntry(body, url, headers, callback) {
  fetch(url, {
    body: JSON.stringify(body),
    headers: headers,
    method: 'POST'
  })
    .then(response => response.json())
    .then(data => {
      callback(null, {
        statusCode: 200,
        body: `${JSON.stringify(data)}`
      })
    })
    .catch((e) => {
      callback(null, {
        statusCode: 400,
        body: `error ${e}`
      })
    })
}

function print(msg) {
  if (NEXT_PUBLIC_ISLOCAL === "true") {
    console.log(msg)
  }
}