'use strict'

const Promise = require('promise')

/**
 * run through some placeholder subjects and set the placeholder to the value
 * if they click on it
 * @param  {DOM} input a DOM input
 * @return {Promise}
 */
module.exports = function placeholderKickoff(input) {
  let focusable = true
  input.addEventListener('focus', () => {
    if (focusable) { input.value = input.placeholder }
    focusable = false
  })

  return typePlaceholder(
    input,
    `Hello my associates, trampolines are for sale!`
  )
  .then(() => typePlaceholder(
    input,
    `With such a huge assortment of new items, you'll never get bored`
  ))
  .then(() => {
    focusable = false
    return typePlaceholder(input, `Your Subject...`, false)
  })
}

function typePlaceholder(input, placeholder, shouldErase = true) {
  let char = 0
  return new Promise((resolve) => {
    const interval = setInterval(() => {
      if (char >= placeholder.length) {
        clearInterval(interval)
        return shouldErase ? erase(input).then(resolve) : false
      }

      input.placeholder = input.placeholder + placeholder[char++]
    }, 60)
  })
}

function erase(input) {
  return new Promise((resolve) => setTimeout(() => {
    const interval = setInterval(() => {
      if (input.placeholder.length === 0) {
        clearInterval(interval)

        return setTimeout(() => resolve(), 1000)
      }

      input.placeholder = input.placeholder.substr(0, input.placeholder.length - 1)
    }, 20)
  }, 3000))
}
