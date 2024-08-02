const messages = [
    ["Efe.", "Oops.", "Ihh rapaz...", "E agora?.", "Ups...", "Hm...", "Ah não..", "Vish!"],
    ["Eu acho que", "Infelizmente", "Aparentemente,", "Parece que", "Uma pena,", "Que estranho,"],
    ["a página especificada não foi encontrada.", "meu programador provavelmente me abortou.", "algo de errado não está certo.", "...eu nunca existi?", "você se perdeu?", "eu não estou aqui?", "eu não sou o que você procura?", "*crise existencial*"],
    ["Desculpa :/", "Uma pena!", "Desculpe.", "É triste.", "Aff..", "Poxa, e agora?", ]
  ];
  

  const messageElements = [
    document.querySelector("#js-whoops"),
    document.querySelector("#js-appears"),
    document.querySelector("#js-error"),
    document.querySelector("#js-apology")
  ];
  


  let lastMessageType = -1;

  let messageTimer = 4000;

  document.addEventListener("DOMContentLoaded", (event) => {
    setupMessages();
    setInterval(() => {
      swapMessage();
    }, messageTimer);
  });
  
 
  function setupMessages() {
    messageElements.forEach((element, index) => {
      let newMessage = getNewMessage(index);
      element.innerText = newMessage;
    });
  }
  


  
  // swap a message for one of the message types
  function swapMessage() {
    let toSwapIndex = getNewSwapIndex();
    let newMessage  = getNewMessage(toSwapIndex);
    // Animate the disappearing, setting width, and reappearing
    messageElements[toSwapIndex].style.lineHeight = "0";
    // once line height is done transitioning, set element width & message
    setTimeout(() => {
      // make sure the element has a width set for transitions
      checkWidthSet(toSwapIndex, messageElements[toSwapIndex].innerText);
      // set the new text
      messageElements[toSwapIndex].innerText = newMessage; 
      // set the new width
      calculateWidth(messageElements[toSwapIndex], newMessage);
    }, 200);
    // once width is done, transition the lineheight back to 1 so we can view the message
    setTimeout(() => {
      messageElements[toSwapIndex].style.lineHeight = "1.2";
    }, 400);
  }
  

  function checkWidthSet(index, message) {
    if (false == messageElements[index].style.width) {
      messageElements[index].style.width = `${messageElements[index].clientWidth}px`;
    }
  }
  
  // Return a new index to swap message in. Should not be the same as the last message type swapped
  function getNewSwapIndex() {
    let newMessageIndex = Math.floor(Math.random() * messages.length);
    while (lastMessageType == newMessageIndex) {
      newMessageIndex = Math.floor(Math.random() * messages.length);
    }
    return newMessageIndex;
  }
  

  function getNewMessage(toSwapIndex) {
    const messagesArray   = messages[toSwapIndex];
    const previousMessage = messageElements[toSwapIndex].innerText;

    let newMessageIndex = Math.floor(Math.random() * messagesArray.length);
    let newMessage      = messagesArray[newMessageIndex];

    while (newMessage == previousMessage) {
      newMessageIndex = Math.floor(Math.random() * messagesArray.length);
      newMessage      = messagesArray[newMessageIndex];
    }
    return newMessage;
  }