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
      } else {
        var body = {}
        var campaignId = ""
        const amount = Number(res.gross_amount)
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
                "integerValue": amount
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
        url = `${baseUrl}/front-end-program/`
        checkSum(url, headers, amount, campaignId, callback)
      }
    }
  })
}
// projects/cipcipp-150996/databases/(default)/documents/front-end-program/
// projects/cipcipp-150996/databases/(default)/documents/front-end-program/GPqnagtqrc6sBSYMOtnj
// projects/cipcipp-150996/databases/(default)/documents/front-end-program/

function checkSum(url, headers, addition, campaignId, callback) {
  fetch(url, {
    headers: headers,
    method: 'GET'
  }).then(response => response.json())
    .then((miaw) => {
      let data = '0'
      let id = '1'
      for (let i = 0; i < 5; i++) {
        try {
          if (campaignId.includes("dev-")) campaignId = "dev"
          if (miaw.documents[i].fields.code.stringValue === campaignId) {
            let basePath = url.replace('https://firestore.googleapis.com/v1/', '')
            id = miaw.documents[i].name.replace(basePath, '')
            data = miaw.documents[i].fields.sum.integerValue
            break
          }
        } catch (e) { }
      }
      if (id === '1') {
        callback(null, {
          statusCode: 400,
          body: 'no id found'
        })
      } else {
        const currentSum = Number(data)
        const nextSum = currentSum + addition
        print(`next sum would be ${nextSum} to ${id}`)
        addSum(url, headers, nextSum, id)
      }
    })
}

function addSum(url, headers, nextSum, id) {
  fetch(`${url}${id}?updateMask.fieldPaths=sum`, {
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
      print(JSON.stringify(data))
      callback(null, {
        statusCode: 200,
        body: `${JSON.stringify(data)}`
      })
    })
    .catch((e) => {
      print(e)
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