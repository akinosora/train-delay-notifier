/* globals isHoliday:false */

const properties = PropertiesService.getScriptProperties();
const PRIMARY_FUNC_NAME = 'fetchDelayInfo';
const TOKEN = properties.getProperty('SLACK_ACCESS_TOKEN');
// チャネル取得
const CHANNEL_ID = properties.getProperty('TRAIN_DELAY_CH');
const SHEET_ID = properties.getProperty('TRAIN_DELAY_SHEET_ID');

const SLEEPING_MESSAGE = 'sleeping...';
const RUNNING_MESSAGE = 'running';

/* eslint-disable no-unused-vars */
function bookDailyCron() {
  deleteTrigger();

  // 祝日/休日は処理しない
  const today = new Date();
  if (isHoliday(today)) {
    return;
  }

  // 平日は15分毎に起動
  ScriptApp.newTrigger(PRIMARY_FUNC_NAME)
    .timeBased()
    .everyMinutes(15)
    .create();
}
/* eslint-enable no-unused-vars */

/**
 * トリガーを全て削除する(削除しないと残り続ける)
 */
function deleteTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() == PRIMARY_FUNC_NAME) {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  initializePrevResult();
}

/**
 * 電車遅延情報チャット内の, 前回の値を初期化し, スリープ状態に切り替える
 */
function initializePrevResult() {
  const mySheet = SpreadsheetApp.openById(SHEET_ID);
  const maxRow = mySheet.getDataRange().getLastRow();
  for (var i = 2; i <= maxRow; i++) {
    mySheet.getRange(`C${i}`).clear();
  }
  mySheet.getRange('D2').setValue(SLEEPING_MESSAGE);
}

// --------------------------------------------------------------------------------------------------- //

/* eslint-disable no-unused-vars */
/**
 * 路線の遅延情報を取得し, 送信する
 *
 * https://tonari-it.com/gas-chatwork-train-delay-spreadsheet/
 */
function fetchDelayInfo() {
  const webAPI = 'https://tetsudo.rti-giken.jp/free/delay.json';
  const webAPIInfo = 'https://rti-giken.jp/fhc/api/train_tetsudo/';
  // 電車遅延情報をJSON形式で取得
  const json = JSON.parse(UrlFetchApp.fetch(webAPI).getContentText()) as ITrainDelayInfo[];

  // シートとその最終行数、シートのデータを取得
  const mySheet = SpreadsheetApp.openById(SHEET_ID);
  const maxRow = mySheet.getDataRange().getLastRow();
  const columns = mySheet.getDataRange().getValues();

  const enum Columns {
    A = 0,
    B,
    C,
  }

  const resolvedDelays: Array<string> = [];
  const continuingDelays: Array<string> = [];
  const newDelays: Array<string> = [];

  const targetTitle = '監視対象鉄道路線一覧';
  let targetBody = '';
  let iconEmoji;

  for (var i = 2; i <= maxRow; i++) {
    const name: string = columns[i - 1][Columns.A]; // A列のカラム
    const company: string = columns[i - 1][Columns.B]; // B列のカラム
    const prevDelayInfo: string = columns[i - 1][Columns.C]; // C列のカラム
    targetBody = targetBody + company + name + '/';

    const info = json.find(info => info.name === name && info.company === company);
    if (!info && !prevDelayInfo) continue;
    else if (!info && prevDelayInfo) {
      resolvedDelays.push(`${company}${name}`);
      mySheet.getRange(`C${i}`).clear();
    } else if (info && !prevDelayInfo) {
      newDelays.push(`${company}${name}`);
      mySheet.getRange(`C${i}`).setValue('遅延中');
    } else if (info && prevDelayInfo) {
      continuingDelays.push(`${company}${name}`);
    }
  }

  if (resolvedDelays.length === 0 && newDelays.length === 0 && mySheet.getRange('D2').getValue() !== SLEEPING_MESSAGE) {
    Logger.log('前回の通知から遅延情報に変更が無いため, 通知を省略します');
    return;
  } else if (continuingDelays.length === 0 && newDelays.length === 0) {
    Logger.log('現在遅延情報はありません！');
    iconEmoji = 'yatta01';
  } else {
    Logger.log('遅延中...');
    iconEmoji = 'orz01';
  }

  /* ---------------------------------------------------------------------------------------
   * slack用config
   * --------------------------------------------------------------------------------------- */
  const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
    contentType: 'application/json',
    method: 'post',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
    },
    payload: JSON.stringify({
      channel: CHANNEL_ID,
      username: '運行情報監視bot',
      icon_emoji: iconEmoji,
      text: '*電車遅延情報*',
      attachments: (function() {
        const attachments: any[] = [];
        if (resolvedDelays.length > 0) {
          attachments.push({
            title: `解消しました :yatta02:`,
            color: 'good',
            fields: resolvedDelays.map(message => {
              return { value: message };
            }),
          });
        }
        if (newDelays.length > 0) {
          attachments.push({
            title: `新たに発生 :orz01:`,
            color: 'danger',
            fields: newDelays.map(message => {
              return { value: message };
            }),
          });
        }
        if (continuingDelays.length > 0) {
          attachments.push({
            title: `継続してます :seyana03:`,
            color: 'warning',
            fields: continuingDelays.map(message => {
              return { value: message };
            }),
          });
        }
        if (newDelays.length === 0 && continuingDelays.length === 0) {
          attachments.push({
            title: `現在障害情報はありません :yatta01:`,
            color: 'good',
          });
        }
        // 監視対象路線一覧 初回実行時のみ表示
        if (mySheet.getRange('D2').getValue() === SLEEPING_MESSAGE) {
          attachments.push({
            fields: [
              {
                title: `${targetTitle} ${webAPIInfo}`,
                value: targetBody,
              },
            ],
          });
        }
        return attachments;
      })(),
    }),
  };

  const res = UrlFetchApp.fetch('https://slack.com/api/chat.postMessage', options);
  Logger.log(res);
  mySheet.getRange('D2').setValue(RUNNING_MESSAGE);
}
/* eslint-enable no-unused-vars */
