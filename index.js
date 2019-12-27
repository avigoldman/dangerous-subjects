'use strict'

const placeholderKickoff = require('./placeholder')
const ellipses = 3
const cuss = require('cuss')
const profanities = filterOutContextualBadWords(cuss).reverse()
const profanitiesRegex = new RegExp(`(?:\\s|^)(${profanities.join('|')})`, 'ig')

const emailClient = document.getElementsByClassName('emailClient__emails')[0]
const count = document.getElementsByClassName('count__content')[0]
const body = document.getElementsByTagName('body')[0]
const form = document.getElementsByTagName('form')[0]
const input = document.getElementsByTagName('input')[0]

placeholderKickoff(input)

form.addEventListener('submit', (e) => e.preventDefault())
input.addEventListener('keyup', formAction)
input.addEventListener('focus', formAction)

/**
 * trigger the search and errors
 */
function formAction() {
  const subject = input.value
  const matches = findPossibleProfanity(subject)
  const subjects = buildDangerousSubjectLines(subject, matches)

  if (subjects.length > 0) {
    setErrors(subjects)
  } else {
    removeErrors()
  }
}

/**
 * filters out bad words that depend on the context they are used: i.e. laid
 * @param  {Object} cuss
 * @return {Array}
 */
function filterOutContextualBadWords(cuss) {
  return Object.entries(cuss)
    .filter(([w, rating]) => rating > 0)
    .map(([w]) => w)
    .sort()
}

/**
 * finds any possible profane endings to the given subjects
 * @param  {String} subject the user's subject
 * @return {Array}          the profane ending words
 */
function findPossibleProfanity (subject) {
  let matches = []
  let results

  while ((results = profanitiesRegex.exec(subject)) !== null) {
    matches.push(results[1])
  }

  return matches
}

/**
 * build an array of profane ending subjects
 * @param  {String} subject  the user's subject
 * @param  {Array}  matches  the profane endings found in findPossibleProfanity
 * @return {Array}           the profane-ending subjects
 */
function buildDangerousSubjectLines (subject, matches) {
  return matches.map((match, i) => {
    const nthOfProfanity = matches.slice(0, i+1).filter((v) => v === match).length - 1
    const subjectUntil = subject.split(match).slice(0, nthOfProfanity + 1).join(match)

    return `${subjectUntil}<span class="highlight">${match}</span>...`
  })
}

/**
 * sets the state to error with the given subjects
 * @param {Array} subjects
 */
function setErrors (subjects) {
  body.classList.add('body--error')
  count.innerHTML = subjects.length
  emailClient.innerHTML = subjects.map((subject) => `
    <div class="email">
      <div class="email__subject">${subject}</div>
      <div class="email__from">fauxpas@whoops.com</div>
      <div class="email__date">Yesterday</div>
    </div>
  `).join('')
}

/**
 * sets the state to errorless
 */
function removeErrors () {
  body.classList.remove('body--error')
  emailClient.innerHTML = ''
}
