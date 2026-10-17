const puppeteer = require("puppeteer")
const data = require("./config.json")
const BaseURL = data.baseURL
const email = data.email
const password = data.password
const keyword = data.keyword
const location = data.location
var avgOfExp = data.AvgExperience
const periodOfTime = data.Period // you can choose : Last 24 hours or Last week
const browserPath = data.ChromePath
const resolution = data.resolution // you can choose : --start-maximized or --window-size=1400,720
const numberOfPagination = data.numberOfPagination // numberOfPagination it means number of execution
const nbrOfOffersPerPage = data.numberOfOffersPerPage // don't touch it leave it like this !!
const fullKeys = data.fullKeys
  ? data.fullKeys
      .toLowerCase()
      .split(",")
      .map((key) => key.trim())
  : []
const badKeys = data.badKeys
  ? data.badKeys
      .toLowerCase()
      .split(",")
      .map((key) => key.trim())
  : []
let page = ""
let browser = ""

let firstPageUrl = null // Variable constante para guardar la URL de la primera página
const ENABLE_AUTO_RELOAD = true // Cambiar a false para deshabilitar la funcionalidad de recarga automática

async function waitForCaptcha() {
  try {
    console.log("Verificando si hay CAPTCHA...")

    const captchaIframe = await page.$("#captcha-internal")

    if (captchaIframe) {
      console.log("¡CAPTCHA detectado en iframe! Esperando a que el usuario lo complete...")

      // Esperar hasta que el iframe del CAPTCHA desaparezca
      await page.waitForFunction(
        () => !document.querySelector("#captcha-internal"),
        { timeout: 300000 }, // Esperar máximo 5 minutos
      )

      console.log("CAPTCHA completado, esperando redirección al feed...")

      await page.waitForFunction(
        () => window.location.pathname.includes("/feed"),
        { timeout: 60000 }, // Esperar máximo 1 minuto para la redirección
      )

      console.log("Redirección al feed completada, continuando...")
      await page.waitForTimeout(3000) // Esperar un poco más para que cargue completamente
    } else {
      console.log("No se detectó CAPTCHA, continuando normalmente")
    }
  } catch (error) {
    console.log("Error al verificar CAPTCHA o timeout:", error.message)
    console.log("Continuando de todas formas...")
  }
}

async function logs() {
  //console.log("mydata is :" + JSON.stringify(data))
}

async function Login() {
  await findTargetAndType('[name="session_key"]', email)
  await findTargetAndType('[name="session_password"]', password)
  page.keyboard.press("Enter")

  await page.waitForTimeout(3000)
  await waitForCaptcha()
}

async function initiliazer() {
  const launchOptions = {
    // Puppeteer descargará y usará su propio Chromium cuando ChromePath esté vacío.
    headless: false,
    args: [resolution],
    defaultViewport: null,
  }

  if (browserPath) {
    launchOptions.executablePath = browserPath
  }

  browser = await puppeteer.launch(launchOptions)
  page = await browser.newPage()

  page.on("console", (msg) => {
    if (
      msg.text().includes("DEBUG EXPERIENCIA") ||
      msg.text().includes("Dentro de page.evaluate") ||
      msg.text().includes("Total labels") ||
      msg.text().includes("Revisando label") ||
      msg.text().includes("Label de experiencia") ||
      msg.text().includes("INPUT FINAL")
    ) {
      console.log("BROWSER LOG:", msg.text())
    }
  })

  const pages = await browser.pages()
  if (pages.length > 1) {
    await pages[0].close()
  }
  await page.goto(BaseURL)
}

async function findTargetAndType(target, value) {
  const f = await page.$(target)
  await f.type(value)
}

async function waitForSelectorAndType(target, value) {
  const typer = await page.waitForSelector(target, { visible: true })
  await typer.type(value)
}

async function buttonClick(selector) {
  try {
    await page.waitForSelector(selector, { visible: true, timeout: 10000 })

    // Verificar que el elemento existe y es clickeable
    const element = await page.$(selector)
    if (!element) {
      console.log(`Elemento no encontrado: ${selector}`)
      return false
    }

    // Verificar que el elemento es clickeable
    const isClickable = await page.evaluate((el) => {
      if (!el) return false
      const rect = el.getBoundingClientRect()
      return rect.width > 0 && rect.height > 0 && !el.disabled
    }, element)

    if (!isClickable) {
      console.log(`Elemento no es clickeable: ${selector}`)
      return false
    }

    await element.click()
    console.log(`Click exitoso en: ${selector}`)
    return true
  } catch (error) {
    console.log(`Error al hacer click en ${selector}:`, error.message)
    return false
  }
}

async function Scrolling() {
  await page.evaluate(() => {
    // Intentar múltiples selectores más robustos
    const selectors = [
      'div[class="scaffold-layout__list-detail-inner"]>section>div>ul',
      ".jobs-search-results-list",
      ".jobs-search-results__list",
      'ul[class*="jobs-search-results"]',
      ".scaffold-layout__list-detail-inner ul",
      '[data-test-id="jobs-search-results-list"]',
    ]

    let element = null

    // Buscar el primer selector que funcione
    for (const selector of selectors) {
      element = document.querySelector(selector)
      if (element) {
        console.log(`Elemento encontrado con selector: ${selector}`)
        break
      }
    }

    // Si encontramos el elemento, hacer scroll
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" })
    } else {
      // Si no encontramos el elemento específico, hacer scroll general
      console.log("No se encontró elemento específico, haciendo scroll general")
      window.scrollBy(0, 300)
    }
  })
}

function changeValue(input, value) {
  var nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set
  nativeInputValueSetter.call(input, value)
  var inputEvent = new Event("input", { bubbles: true })
  input.dispatchEvent(inputEvent)
}

function humanRandomDelay(min, max) {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  console.log(`⏳ Delay humano: ${delay}ms`);
  return delay;
}

async function humanType(element, text) {
  await element.click({ clickCount: 3 });
  await element.press('Backspace');
  
  // Usar evaluate para simular escritura humana
  await element.evaluate((el, text) => {
    el.value = ''; // Limpiar
  }, text);
  
  for (let char of text) {
    await element.evaluate((el, char) => {
      el.value += char;
      // Disparar eventos de input
      const event = new Event('input', { bubbles: true });
      el.dispatchEvent(event);
    }, char);
    
    await page.waitForTimeout(humanRandomDelay(40, 150));
  }
}

async function clearAndType(selector, value) {
  const element = await page.waitForSelector(selector, { visible: true })
  await element.click({ clickCount: 3 }) // Selecciona todo el texto
  await element.press("Backspace") // Borra el contenido
  //await element.type(value) // Escribe el nuevo valor
  await page.waitForTimeout(humanRandomDelay(100, 300))
  await humanType(element, value);
}

async function fillFormFields() {
  await page.waitForTimeout(2000)

  try {

    
    // 1. LLENAR TODOS LOS CAMPOS DE EXPERIENCIA con valor 2
    console.log("=== INICIO DEBUG EXPERIENCIA ===")
    console.log("Valor de avgOfExp:", avgOfExp)

    const experienceField = await page.evaluate((avgExp) => {
      console.log("Dentro de page.evaluate, avgExp:", avgExp)

      const inputs = Array.from(
        document.querySelectorAll('input[type="text"], input[type="number"], input:not([type])'),
      )
      console.log("Total inputs encontrados:", inputs.length)

      let experienceInputsFound = 0

      // Buscar TODOS los inputs que tengan un label asociado con "years" y "experience"
      for (const input of inputs) {
        const inputId = input.id
        if (inputId) {
          const label = document.querySelector(`label[for="${inputId}"]`)
          if (label) {
            const labelText = label.textContent.toLowerCase()
            console.log("Revisando input con label:", labelText)

            // Buscar específicamente preguntas sobre años de experiencia
            if (
              (labelText.includes("years") || labelText.includes("años")) &&
              (labelText.includes("experience") || labelText.includes("experiencia")) &&
              !labelText.includes("expectativa salarial") &&
              !labelText.includes("salary")
            ) {
              console.log("¡Input de experiencia encontrado!")
              console.log("Label text:", labelText)
              console.log("Input ID:", inputId)
              console.log("Input type:", input.type)

              // Limpiar y llenar el campo
              input.focus()
              input.value = ""
              input.value = avgExp.toString()

              // Disparar eventos
              input.dispatchEvent(new Event("input", { bubbles: true }))
              input.dispatchEvent(new Event("change", { bubbles: true }))
              input.dispatchEvent(new Event("blur", { bubbles: true }))

              console.log("Campo de experiencia llenado con:", avgExp)
              experienceInputsFound++
            }
          }
        }
      }

      console.log("Total campos de experiencia llenados:", experienceInputsFound)
      return experienceInputsFound > 0
    }, avgOfExp)

    console.log("Resultado de experienceField:", experienceField)
    console.log("=== FIN DEBUG EXPERIENCIA ===")

    // 2. SELECCIONAR RADIO BUTTONS con "YES/SÍ"
    await page.evaluate(() => {
      const radioGroups = document.querySelectorAll(
        'fieldset[data-test-form-builder-radio-button-form-component="true"]',
      )
      console.log("Total grupos de radio buttons encontrados:", radioGroups.length)

      radioGroups.forEach((fieldset, index) => {
        console.log(`Procesando grupo de radio buttons ${index + 1}:`)

        // Buscar todos los radio buttons en este grupo
        const radioButtons = fieldset.querySelectorAll('input[type="radio"]')
        console.log("  Radio buttons en este grupo:", radioButtons.length)

        // Buscar el radio button "Yes" o "Sí"
        let yesRadio = null

        for (const radio of radioButtons) {
          const label = document.querySelector(`label[for="${radio.id}"]`)
          if (label) {
            const labelText = label.textContent.toLowerCase().trim()
            console.log(`    Radio button: "${labelText}" (value: ${radio.value})`)

            if (
              labelText === "yes" ||
              labelText === "sí" ||
              labelText === "si" ||
              radio.value.toLowerCase() === "yes" ||
              radio.value.toLowerCase() === "sí" ||
              radio.value.toLowerCase() === "si"
            ) {
              yesRadio = radio
              break
            }
          }
        }

        if (yesRadio && !yesRadio.checked) {
          console.log("  ✓ Seleccionando radio button 'Yes/Sí'")
          yesRadio.checked = true
          yesRadio.dispatchEvent(new Event("change", { bubbles: true }))
          yesRadio.dispatchEvent(new Event("click", { bubbles: true }))
        } else if (yesRadio && yesRadio.checked) {
          console.log("  ✓ Radio button 'Yes/Sí' ya estaba seleccionado")
        } else {
          console.log("  ✗ No se encontró radio button 'Yes/Sí' en este grupo")
        }
      })
    })

    // 3. LLENAR SELECTS con "SI/YES" (excepto Phone country)
    await page.evaluate(() => {
      const selects = document.querySelectorAll("select")
      console.log("Total selects encontrados:", selects.length)

      selects.forEach((select, index) => {
        const selectId = select.id || ""
        const selectLabel = document.querySelector(`label[for="${selectId}"]`)
        const labelText = selectLabel ? selectLabel.textContent.toLowerCase() : ""

        console.log(`Procesando select ${index + 1}:`)
        console.log("  Label text:", labelText)

        // NO cambiar selects de código de país de teléfono
        if (
          labelText.includes("phone country") ||
          labelText.includes("phone country code") ||
          labelText.includes("código del país") ||
          labelText.includes("codigo del pais")
        ) {
          console.log("  ⚠️ Saltando select de código de país de teléfono")
          return
        }

        const options = Array.from(select.options)
        console.log(
          "  Opciones disponibles:",
          options.map((opt) => opt.text),
        )

        const yesOption = options.find(
          (option) =>
            option.text.toLowerCase().includes("sí") ||
            option.text.toLowerCase().includes("si") ||
            option.text.toLowerCase().includes("yes") ||
            option.value.toLowerCase() === "yes" ||
            option.value.toLowerCase() === "si",
        )

        if (yesOption) {
          select.value = yesOption.value
          select.dispatchEvent(new Event("change", { bubbles: true }))
          select.dispatchEvent(new Event("input", { bubbles: true }))
          console.log(`  ✓ Seleccionado '${yesOption.text}' en select`)
        } else {
          console.log("  ✗ No se encontró opción SI/YES en este select")
        }
      })
    })

    // 4. LLENAR CAMPOS DE EXPECTATIVA SALARIAL con valor 900
    const salaryFieldSelector = await page.evaluate(() => {
      const labels = Array.from(document.querySelectorAll("label"))
      const salaryLabel = labels.find((label) => {
        const text = label.textContent.toLowerCase()
        return (
          text.includes("expectativa salarial") ||
          text.includes("banda salarial") ||
          text.includes("salario bruto") ||
          text.includes("salario deseado") ||
          text.includes("salario esperado") ||
          text.includes("remuneración") ||
          text.includes("sueldo") ||
          text.includes("salario anual") ||
          text.includes("rango salarial") ||
          text.includes("pretensión salarial") ||
          text.includes("salario neto") ||
          text.includes("compensación") ||
          text.includes("retribución") ||
          text.includes("salario") ||
          text.includes("salariales") ||
          text.includes("expectativas salariales") ||
          text.includes("salary") ||
          text.includes("salary expectation") ||
          text.includes("expected salary") ||
          text.includes("desired salary") ||
          text.includes("salary range") ||
          text.includes("compensation") ||
          text.includes("remuneration") ||
          text.includes("pay expectation") ||
          text.includes("annual salary") ||
          text.includes("gross salary") ||
          text.includes("net salary") ||
          text.includes("wage") ||
          text.includes("pay range") ||
          text.includes("salary band") ||
          text.includes("target salary")
        )
      })

      if (salaryLabel) {
        const inputId = salaryLabel.getAttribute("for")
        if (inputId) {
          return `#${inputId}`
        }
      }
      return null
    })

    if (salaryFieldSelector) {
      console.log("Campo de expectativa salarial encontrado, llenando con espectativa salarial")
      await page.focus(salaryFieldSelector)
      await page.evaluate((selector) => {
        const element = document.querySelector(selector)
        if (element) {
          element.value = ""
        }
      }, salaryFieldSelector)
      await page.type(salaryFieldSelector, "1200")
      await page.evaluate((selector) => {
        const element = document.querySelector(selector)
        if (element) {
          element.dispatchEvent(new Event("input", { bubbles: true }))
          element.dispatchEvent(new Event("change", { bubbles: true }))
        }
      }, salaryFieldSelector)
      await page.waitForTimeout(1000)
      console.log("Expectativa salarial llenada exitosamente!")
    }
  } catch (error) {
    console.log("Error al llenar campos:", error.message)
  }

  await page.waitForTimeout(1000)

  await detectDiscardModal()

  await detectDiscardEmpyfield()
}

async function detectDiscardModal() {
  try {
    const modal = await page.$('[data-test-modal-id="data-test-easy-apply-discard-confirmation"]')
    if (modal) {
      console.log("🚨 Modal de descarte detectado - Intervención manual requerida")

      // Reproducir sonido de alerta (beep corto)
      await page.evaluate(() => {
          const audioContext = new (window.AudioContext || window.webkitAudioContext)();
          
          // Función para crear un bip individual
          function createBeep(startTime, duration = 0.2) {
              const oscillator = audioContext.createOscillator();
              const gainNode = audioContext.createGain();
              
              oscillator.connect(gainNode);
              gainNode.connect(audioContext.destination);
              
              oscillator.frequency.value = 800; // Frecuencia del beep
              oscillator.type = 'sine';
              
              gainNode.gain.setValueAtTime(0.3, startTime);
              gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
              
              oscillator.start(startTime);
              oscillator.stop(startTime + duration);
          }
          
          // Crear 6 bips con pausas entre ellos
          const beepDuration = 0.2; // Duración de cada bip
          const pauseDuration = 0.15; // Pausa entre bips
          
          for (let i = 0; i < 6; i++) {
              const startTime = audioContext.currentTime + (i * (beepDuration + pauseDuration));
              createBeep(startTime, beepDuration);
          }
      }); 

      return true // Modal detectado
    }
    return false // No hay modal
  } catch (error) {
    console.log("Error al detectar modal de descarte:", error)
    return false
  }
}

async function detectDiscardEmpyfield() {
  try {
    const empyField = await page.$('.artdeco-inline-feedback__icon')
    if (empyField) {
      console.log('🚨 NECESITA AYUDA MANUAL - Reproduciendo alerta');
      
      // Sonido simple con 6 beeps
      // Reproducir sonido de alerta (beep corto)
      await page.evaluate(() => {
          const audioContextFall = new (window.AudioContext || window.webkitAudioContext)();
          
          // Función para crear un bip individual
          function createBeepFall(startTimeFall, duration = 0.2) {
              const oscillatorFall = audioContextFall.createOscillator();
              const gainNodeFall = audioContextFall.createGain();
              
              oscillatorFall.connect(gainNodeFall);
              gainNodeFall.connect(audioContextFall.destination);
              
              oscillatorFall.frequency.value = 800; // Frecuencia del beep
              oscillatorFall.type = 'sine';
              
              gainNodeFall.gain.setValueAtTime(0.3, startTimeFall);
              gainNodeFall.gain.exponentialRampToValueAtTime(0.01, startTimeFall + duration);
              
              oscillatorFall.start(startTimeFall);
              oscillatorFall.stop(startTimeFall + duration);
          }
          
          // Crear 4 bips con pausas entre ellos
          const beepDurationFall = 0.2; // Duración de cada bip
          const pauseDurationFall = 0.15; // Pausa entre bips
          
          for (let i = 0; i < 6; i++) {
              const startTimeFall = audioContextFall.currentTime + (i * (beepDurationFall + pauseDurationFall));
              createBeepFall(startTimeFall, beepDurationFall);
          }
      });

      return true // campo vacio  detectado
    }
    return false // 
  } catch (error) {
    console.log("Error al detectar campo vacio:", error)
    return false
  }
}

async function checkJobTitleKeywords(jobSelector) {
  try {
    const jobTitle = await page.evaluate((selector) => {
      const jobElement = document.querySelector(selector)
      if (jobElement) {
        // Buscar el título en diferentes estructuras posibles
        const titleElement =
          jobElement.querySelector("strong") || jobElement.querySelector(".job-card-list__title") || jobElement
        return titleElement ? titleElement.textContent.trim() : ""
      }
      return ""
    }, jobSelector)

    if (!jobTitle) {
      console.log("❌ No se pudo extraer el título del trabajo")
      return false
    }

    console.log(`🔍 Verificando título: "${jobTitle}"`)

    const titleText = jobTitle.toLowerCase()
    const matchedKeys = fullKeys.filter((key) => {
      const escapedFullKey = key.replace(/[+*?^${}()|[\]\\]/g, '\\$&');
      // En lugar de word boundaries estrictos, usar separadores más flexibles
      const flexibleRegex = new RegExp(`(^|[\\s/(),-])(${escapedFullKey})($|[\\s/(),-])`, "i");
      return flexibleRegex.test(titleText);
    })

    if (matchedKeys.length > 0) {
      console.log(`✅ Título coincide con palabras clave: [${matchedKeys.join(", ")}]`)
      return true
    } else {
      console.log(`⏭ Título no coincide con ninguna palabra clave, saltando trabajo`)
      return false
    }
  } catch (error) {
    console.log("Error al verificar palabras clave del título:", error.message)
    return false
  }
}

async function checkBadKeywords(jobSelector) {
  try {
    if (badKeys.length === 0) {
      console.log("🔍 No hay badKeys configuradas, continuando...")
      return false
    }

    console.log("🔍 Verificando badKeys en título y descripción...")

    const hasBadKeywords = await page.evaluate(
      (badKeysList, selector) => {
        // 1. Verificar en el título del trabajo usando los selectores correctos
        const jobElement = document.querySelector(selector)
        let titleText = ""

        if (jobElement) {
          // Buscar el título en diferentes estructuras posibles
          const titleElement =
            jobElement.querySelector("strong") || jobElement.querySelector(".job-card-list__title") || jobElement
          titleText = titleElement ? titleElement.textContent.toLowerCase().trim() : ""
        }

        console.log(`Título encontrado: "${titleText}"`)

        // Verificar badKeys en título
        for (const badKey of badKeysList) {
                    
          const escapedBadKeyTitle = badKey.replace(/[+*?^${}()|[\]\\]/g, '\\$&');
          const titleRegex = new RegExp(`(^|[\\s/(),-])(${escapedBadKeyTitle})($|[\\s/(),-])`, "i");
          if (titleRegex.test(titleText)) {
            console.log(`❌ BadKey "${badKey}" encontrada en título`)
            return { found: true, location: "título", keyword: badKey }
          }
        }

        // 2. Verificar en la descripción del trabajo
        const jobDetailsWrapper = document.querySelector(".jobs-description__container")

        if (!jobDetailsWrapper) {
          console.log("No se encontró la sección de detalles del trabajo")
          return { found: false }
        }

        const descriptionText = jobDetailsWrapper.textContent.toLowerCase()
        console.log(`Descripción encontrada (primeros 200 chars): "${descriptionText.substring(0, 200)}..."`)

        // Verificar badKeys en descripción
        for (const badKey of badKeysList) {
          
          const escapedBadKeyDesc = badKey.replace(/[+*?^${}()|[\]\\]/g, '\\$&');
          const descriptionRegex = new RegExp(`(^|[\\s/(),-])(${escapedBadKeyDesc})($|[\\s/(),-])`, "i");


          if (badKey.toLowerCase().trim() === "devops" && descriptionRegex.test(descriptionText)) {
            console.log('🔥 "devops" encontrada en descripción pero se IGNORA como badKey');
            continue; // 🔥 No marcamos como encontrada, seguimos con la siguiente badKey
          }

          if (descriptionRegex.test(descriptionText)) {
            console.log(`❌ BadKey "${badKey}" encontrada en descripción`)
            return { found: true, location: "descripción", keyword: badKey }
          }
        }

        console.log("✅ No se encontraron badKeys en título ni descripción")
        return { found: false }
      },
      badKeys,
      jobSelector,
    )

    if (hasBadKeywords.found) {
      console.log(`🚫 Saltando trabajo - badKey "${hasBadKeywords.keyword}" encontrada en ${hasBadKeywords.location}`)
      return true
    }

    console.log("✅ Trabajo aprobado - no contiene badKeys")
    return false
  } catch (error) {
    console.log("Error al verificar badKeys:", error.message)
    return false
  }
}

async function handlePagination() {
  try {
    console.log("🔄 Iniciando proceso de paginación...")

    // Esperar a que aparezca la sección de paginación
    await page.waitForSelector(".jobs-search-pagination__pages", { timeout: 10000 })

    const paginationResult = await page.evaluate(() => {
      const paginationContainer = document.querySelector(".jobs-search-pagination__pages")

      if (!paginationContainer) {
        console.log("No se encontró contenedor de paginación")
        return { success: false, reason: "No pagination container" }
      }

      // Encontrar el botón activo actual
      const activeButton = paginationContainer.querySelector(".jobs-search-pagination__indicator-button--active")

      if (!activeButton) {
        console.log("No se encontró botón activo")
        return { success: false, reason: "No active button" }
      }

      const currentPageText = activeButton.textContent.trim()
      console.log(`Página actual: ${currentPageText}`)

      // Buscar el siguiente botón (página siguiente)
      const allButtons = Array.from(paginationContainer.querySelectorAll(".jobs-search-pagination__indicator-button"))
      const activeIndex = allButtons.indexOf(activeButton)

      if (activeIndex === -1) {
        console.log("No se pudo determinar índice del botón activo")
        return { success: false, reason: "Active button index not found" }
      }

      // Buscar el siguiente botón que no sea "..." y que tenga un número mayor
      let nextButton = null
      for (let i = activeIndex + 1; i < allButtons.length; i++) {
        const buttonText = allButtons[i].textContent.trim()
        if (buttonText !== "…" && !isNaN(Number.parseInt(buttonText))) {
          nextButton = allButtons[i]
          break
        }
      }

      if (!nextButton) {
        console.log("No hay más páginas disponibles")
        return { success: false, reason: "No more pages" }
      }

      const nextPageText = nextButton.textContent.trim()
      console.log(`Haciendo click en página: ${nextPageText}`)

      // Hacer click en el siguiente botón
      nextButton.click()

      return {
        success: true,
        currentPage: currentPageText,
        nextPage: nextPageText,
      }
    })

    if (paginationResult.success) {
      console.log(`✅ Paginación exitosa: ${paginationResult.currentPage} → ${paginationResult.nextPage}`)

      // Esperar a que cargue la nueva página
      await page.waitForTimeout(5000)

      // Verificar que la página cambió esperando a que aparezcan nuevos trabajos
      await page.waitForSelector(".scaffold-layout__list-item", { timeout: 15000 })

      console.log("✅ Nueva página cargada correctamente")
      return true
    } else {
      console.log(`❌ Paginación falló: ${paginationResult.reason}`)
      return false
    }
  } catch (error) {
    console.log("❌ Error durante paginación:", error.message)
    return false
  }
}

async function FillAndApply() {
  let i = 1
  let lastIndexForPagination = 1

  if (!firstPageUrl) {
    firstPageUrl = page.url()
    console.log("🔗 URL de primera página guardada:", firstPageUrl)
  }

  while (i <= numberOfPagination) {
    console.log("Scrolling the page N°" + i)

    await waitForCaptcha()

    //Loop trough list elements
    for (let index = 1; index <= nbrOfOffersPerPage; index++) {

      await page.waitForTimeout(humanRandomDelay(1000, 3000));

      let state = true
      await page.waitForTimeout(3000)
      await Scrolling()
      console.log(`Apply N°[${index}]`)

      console.log("🔄 Reseteando estado para nuevo trabajo...")

      // Resetear variables de control
      state = true

      // Limpiar cualquier modal o estado residual del DOM
      try {
        await page.evaluate(() => {
          // Cerrar cualquier modal que pueda estar abierto
          const modals = document.querySelectorAll(".artdeco-modal, #artdeco-modal-outlet")
          modals.forEach((modal) => {
            const closeBtn = modal.querySelector('button[aria-label*="Cerrar"], .artdeco-modal__dismiss')
            if (closeBtn) closeBtn.click()
          })

          // Limpiar focus de cualquier elemento
          if (document.activeElement) {
            document.activeElement.blur()
          }
        })

        await page.waitForTimeout(1000)
        console.log("✅ Estado reseteado correctamente")
      } catch (error) {
        console.log("⚠️ Error al resetear estado, continuando:", error.message)
      }

      await waitForCaptcha()

      // Selector anterior obsoleto: li[class*="jobs-search-results__list-item"]:nth-child(${index})>div>div>div>div+div>div
      // Nuevo selector basado en HTML real:
      const jobSelectors = [
        `li.scaffold-layout__list-item:nth-child(${index}) a.job-card-container__link`,
        `li[data-occludable-job-id]:nth-child(${index}) a[data-control-id]`,
        `li.ember-view:nth-child(${index}) .job-card-container__link`,
        `li:nth-child(${index}) a[aria-label*="Full"]`, // Fallback más genérico
      ]

      let jobClicked = false
      let selectedJobSelector = null

      for (const selector of jobSelectors) {
        try {
          const jobElement = await page.$(selector)
          if (jobElement) {
            selectedJobSelector = selector

            if (fullKeys.length > 0) {
              const hasMatchingKeywords = await checkJobTitleKeywords(selector)
              if (!hasMatchingKeywords) {
                console.log(`🚫 Saltando trabajo ${index} - no coincide con palabras clave`)
                break // Salir del bucle de selectores y continuar con el siguiente trabajo
              }
            }

            console.log(`Haciendo click en trabajo con selector: ${selector}`)
            await jobElement.click()
            await page.waitForTimeout(humanRandomDelay(1500, 3500));
            jobClicked = true
            break
          }
        } catch (error) {
          console.log(`Selector ${selector} no funcionó, probando siguiente...`)
        }
      }

      if (!jobClicked) {
        console.log(`No se pudo hacer click en el trabajo ${index}, saltando...`)
        if (index === nbrOfOffersPerPage) {
          console.log("📄 Es el último trabajo de la página, intentando paginación...")
          const paginationSuccess = await handlePagination()
          if (!paginationSuccess) {
            console.log("❌ No se pudo paginar, terminando proceso")
            return
          }
        }
        continue
      }

      if (selectedJobSelector && fullKeys.length > 0) {
        const hasMatchingKeywords = await checkJobTitleKeywords(selectedJobSelector)
        if (!hasMatchingKeywords) {
          if (index === nbrOfOffersPerPage) {
            console.log("📄 Es el último trabajo de la página, intentando paginación...")
            const paginationSuccess = await handlePagination()
            if (!paginationSuccess) {
              console.log("❌ No se pudo paginar, terminando proceso")
              return
            }
          }
          continue
        }
      }

      if (index === nbrOfOffersPerPage) lastIndexForPagination++

      await page.waitForTimeout(2000)

      console.log("Verificando el tiempo de la publicacion antes de proceder...")
      const tooManyApplications = await checkTooManyApplications()

      if (!tooManyApplications) {
        console.log("⏭ Saltando aplicación - trabajo publicado hace mucho, no seras uno de los primeros")

        if (ENABLE_AUTO_RELOAD) {
          console.log("🔄 No hay más trabajos recientes disponibles")
          console.log("⏰ Esperando 5 minutos antes de recargar la primera página...")

          // Esperar 5 minutos (300,000 milisegundos)
          await page.waitForTimeout(180000)

          console.log("🔄 Recargando primera página:", firstPageUrl)
          await page.goto(firstPageUrl)
          await page.waitForTimeout(3000)

          console.log("✅ Página recargada, reiniciando proceso de búsqueda...")

          // Reiniciar el proceso desde la primera página
          i = 1
          index = 0 // Se incrementará al continuar el loop
          continue
        }

        if (index === nbrOfOffersPerPage) {
          console.log("📄 Es el último trabajo de la página, intentando paginación...")
          const paginationSuccess = await handlePagination()
          if (!paginationSuccess) {
            console.log("❌ No se pudo paginar, terminando proceso")
            return
          }
        }
        continue // Continuar al siguiente trabajo en lugar de terminar todo el proceso
      }

      console.log("Verificando badKeys en título y descripción...")
      const hasBadKeywords = await checkBadKeywords(selectedJobSelector)

      if (hasBadKeywords) {
        console.log("⏭ Saltando aplicación - trabajo contiene badKeys")
        if (index === nbrOfOffersPerPage) {
          console.log("📄 Es el último trabajo de la página, intentando paginación...")
          const paginationSuccess = await handlePagination()
          if (!paginationSuccess) {
            console.log("❌ No se pudo paginar, terminando proceso")
            return
          }
        }
        continue
      }

      
      const isAlreadyApplied = await page.evaluate(() => {
        // Buscar indicadores de que ya se aplicó al trabajo
        const appliedIndicators = [
          ".artdeco-inline-feedback--success", // Mensaje de éxito "Solicitado el hace X tiempo"
          'a[id="jobs-apply-see-application-link"]', // Link "Ver solicitud"
          'span:contains("Solicitado")', // Texto "Solicitado"
          '[aria-label*="Solicitado"]', // Elementos con aria-label que contengan "Solicitado"
        ]

        for (const selector of appliedIndicators) {
          // Para selectores que no usan :contains (que no es CSS válido)
          if (selector === 'span:contains("Solicitado")') {
            const spans = document.querySelectorAll("span")
            for (const span of spans) {
              if (span.textContent.toLowerCase().includes("solicitado")) {
                console.log('Trabajo ya aplicado detectado por texto "Solicitado"')
                return true
              }
            }
          } else {
            const element = document.querySelector(selector)
            if (element) {
              console.log(`Trabajo ya aplicado detectado por selector: ${selector}`)
              return true
            }
          }
        }

        // Buscar también por texto específico en toda la sección de aplicación
        const applySection = document.querySelector(".jobs-s-apply")
        if (applySection) {
          const sectionText = applySection.textContent.toLowerCase()
          if (sectionText.includes("solicitado") || sectionText.includes("applied")) {
            console.log("Trabajo ya aplicado detectado por texto en sección de aplicación")
            return true
          }
        }

        return false
      })

      if (isAlreadyApplied) {
        console.log(`⏭ Trabajo ${index} ya fue aplicado anteriormente, saltando al siguiente`)
        if (index === nbrOfOffersPerPage) {
          console.log("📄 Es el último trabajo de la página, intentando paginación...")
          const paginationSuccess = await handlePagination()
          if (!paginationSuccess) {
            console.log("❌ No se pudo paginar, terminando proceso")
            return
          }
        }
        continue
      }

      const easyApplySelectors = [
        "#jobs-apply-button-id", // ID específico del HTML real
        'button[aria-label*="Solicitud sencilla"]',
        'button[aria-label*="Easy Apply"]', // por si aparece en inglés
        ".jobs-apply-button",
        "button[data-job-id]",
      ]

      let easyApplyButton = null
      let isExternalJobFlag = false

      for (const selector of easyApplySelectors) {
        try {
          // Espera a que aparezca el selector en el DOM (máx 5s)
          await page.waitForSelector(selector, { timeout: 5000 })

          const btnHandle = await page.$(selector)

          if (btnHandle) {
            const isExternal = await page.evaluate((el) => {
              const svg = el.querySelector("svg use")
              if (svg) {
                const href = svg.getAttribute("href")
                return href && href.includes("link-external")
              }
              return false
            }, btnHandle)

            if (isExternal) {
              console.log(`⏭ Botón encontrado con ${selector} pero es externo, se ignora`)
              isExternalJobFlag = true
              break // Salir del bucle de selectores
            }

            // Leer aria-label para confirmar que es Easy Apply
            const ariaLabel = await page.evaluate((el) => el.getAttribute("aria-label"), btnHandle)

            if (
              ariaLabel &&
              (ariaLabel.toLowerCase().includes("solicitud sencilla") || ariaLabel.toLowerCase().includes("easy apply"))
            ) {
              easyApplyButton = btnHandle
              console.log(`✅ Encontrado botón EASY APPLY con: ${selector}`)
              break
            }
          }
        } catch (err) {
          console.log(`⏳ No se encontró con: ${selector}`)
        }
      }

      if (isExternalJobFlag) {
        console.log("🔄 Saltando al siguiente trabajo debido a aplicación externa")
        if (index === nbrOfOffersPerPage) {
          console.log("📄 Es el último trabajo de la página, intentando paginación...")
          const paginationSuccess = await handlePagination()
          if (!paginationSuccess) {
            console.log("❌ No se pudo paginar, terminando proceso")
            return
          }
        }
        continue
      }

      if (!easyApplyButton) {
        console.log("❌ No se encontró el botón de Solicitud sencilla en ningún selector")
        if (index === nbrOfOffersPerPage) {
          console.log("📄 Es el último trabajo de la página, intentando paginación...")
          const paginationSuccess = await handlePagination()
          if (!paginationSuccess) {
            console.log("❌ No se pudo paginar, terminando proceso")
            return
          }
        }
      } else {
        console.log("🚀 Procediendo con Easy Apply dentro de LinkedIn...")
      }

      if (easyApplyButton) {
        await easyApplyButton.click()

        while (state == true) {

          await page.waitForTimeout(humanRandomDelay(800, 2000));

          await page.waitForTimeout(2000)

          await fillFormFields()

          const submitButtonSelectors = [
            'button[aria-label="Enviar solicitud"]', // Selector exacto del HTML proporcionado
            "button[data-live-test-easy-apply-submit-button]", // Atributo específico del HTML
            'button[aria-label*="Enviar solicitud"]',
            'button[aria-label*="Revisar tu solicitud"]',
            "button[data-easy-apply-submit-button]",
            '#artdeco-modal-outlet button.artdeco-button--primary[aria-label*="Enviar"]',
            '.artdeco-modal button[type="submit"]',
          ]

          let submitButton = null
          for (const selector of submitButtonSelectors) {
            submitButton = await page.$(selector)
            if (submitButton) {
              console.log(`¡Encontrado botón "Enviar solicitud" con: ${selector}!`)
              break
            }
          }

          // Si encontramos el botón de envío, hacer click inmediatamente y salir del bucle
          if (submitButton) {
            await submitButton.click()
            console.log("Solicitud enviada exitosamente desde detección temprana")
            state = false
            break
          }

          const nextButtonSelectors = [
            "button[data-easy-apply-next-button]", // Selector específico del HTML real
            'button[aria-label*="Ir al siguiente paso"]',
            'button[aria-label*="Siguiente"]',
            'button[aria-label*="Continuar"]',
            '#artdeco-modal-outlet button.artdeco-button--primary:not([aria-label*="Enviar"])',
            '.artdeco-modal button[type="button"]:not([aria-label*="Cerrar"]):not([aria-label*="Descartar"])',
          ]

          let nextButton = null
          for (const selector of nextButtonSelectors) {
            nextButton = await page.$(selector)
            if (nextButton) {
              console.log(`Encontrado botón Siguiente con: ${selector}`)
              break
            }
          }

          if (nextButton) {
            await nextButton.click()
            state = true
          } else {
            state = false
            break
          }
          await page.waitForTimeout(3000)
        }

        if (state == false) {
          await page.waitForTimeout(3000)

          await fillFormFields()

          const submitButtonSelectors = [
            'button[aria-label*="Enviar solicitud"]',
            'button[aria-label*="Revisar tu solicitud"]',
            "button[data-easy-apply-submit-button]",
            '#artdeco-modal-outlet button.artdeco-button--primary[aria-label*="Enviar"]',
            '.artdeco-modal button[type="submit"]',
          ]

          let submitButton = null
          for (const selector of submitButtonSelectors) {
            submitButton = await page.$(selector)
            if (submitButton) {
              await submitButton.click()
              break
            }
          }

          if (submitButton) {
            console.log("Solicitud enviada exitosamente")
          }

          await page.waitForTimeout(3000)

          let attempts = 0
          do {
            await page.waitForTimeout(4000)

            const closeButtonSelectors = [
              'button[aria-label*="Cerrar"]',
              'button[aria-label*="Descartar"]',
              ".artdeco-modal__dismiss",
              "#artdeco-modal-outlet button[data-test-modal-close-btn]",
              ".artdeco-modal .artdeco-modal__dismiss",
            ]

            let closeButton = null
            for (const selector of closeButtonSelectors) {
              closeButton = await page.$(selector)
              if (closeButton) break
            }

            if (!closeButton) {
              attempts++
              console.log(`Intento ${attempts} - Buscando botón de envío final`)

              let finalSubmit = null
              for (const selector of submitButtonSelectors) {
                finalSubmit = await page.$(selector)
                if (finalSubmit) {
                  await finalSubmit.click()
                  break
                }
              }
            } else {
              attempts = -2
            }
          } while (attempts >= 0 && attempts < 5)

          console.log("Cerrando modal")
          await page.waitForTimeout(4000)

          let closeModalButton = null
          const closeModalSelectors = [
            'button[aria-label*="Cerrar"]',
            ".artdeco-modal__dismiss",
            "#artdeco-modal-outlet .artdeco-modal__dismiss",
          ]

          for (const selector of closeModalSelectors) {
            closeModalButton = await page.$(selector)
            if (closeModalButton) {
              await closeModalButton.click()
              break
            }
          }

          // Después de completar la aplicación
          const randomWaitTime = Math.floor(Math.random() * (360000 - 180000 + 1)) + 180000;
          console.log(`⏰ Esperando ${Math.round(randomWaitTime/1000/60 * 10)/10} minutos antes del siguiente trabajo...`);
          await page.waitForTimeout(randomWaitTime); 

        }
      }

      if (index === nbrOfOffersPerPage) {
        console.log("📄 Procesado último trabajo de la página, intentando paginación...")
        const paginationSuccess = await handlePagination()
        if (!paginationSuccess) {
          console.log("❌ No se pudo paginar, terminando proceso")
          return
        }
      }

    }

    // await buttonClick(`ul[class="artdeco-pagination__pages artdeco-pagination__pages--number"]>li:nth-child(${lastIndexForPagination})`)

    i++
    console.log("finished Scrolling page N°" + (i - 1))
  }
}

async function jobCriteriaByTime() {

  // 🔥 Helper interno para hacer click en "Mostrar resultados"
  async function clickTimeFilterApplyButton() { // 🔥 NUEVO
    // 🔥 Probamos varios selectores robustos
    const applySelectors = [
      'button[aria-label*="Aplicar el filtro actual para mostrar resultados"]',
      '.reusable-search-filters-buttons button.artdeco-button--primary',
      'button.artdeco-button--primary.ml2'
    ]

    for (const selector of applySelectors) {
      const successApply = await buttonClick(selector)
      if (successApply) {
        console.log(`🔥 Botón "Mostrar resultados" clicado con: ${selector}`)
        return true
      }
    }

    // 🔥 Fallback: buscar el botón por el texto "Mostrar resultados"
    try {
      const buttonHandle = await page.waitForFunction(
        () => {
          const buttons = Array.from(document.querySelectorAll("button"))
          return buttons.find(
            (b) =>
              b.textContent &&
              b.textContent.trim().includes("Mostrar resultados")
          ) || null
        },
        { timeout: 5000 }
      )

      if (buttonHandle) {
        await buttonHandle.click()
        console.log('🔥 Botón "Mostrar resultados" clicado por texto')
        return true
      }
    } catch (e) {
      console.log('🔥 No se pudo encontrar botón "Mostrar resultados" por texto:', e.message)
    }

    console.log('🔥 No se pudo hacer click en "Mostrar resultados"')
    return false
  }
  // ------------- FIN helper nuevo 🔥 -------------


  // Intentar hacer click en EASY APPLY con múltiples selectores
  const easyApplySelectors = [
    ".search-reusables__filter-binary-toggle",
    'button[aria-label*="Easy Apply"]',
    'button[aria-label*="Solicitud sencilla"]',
    ".jobs-search-filter-easy-apply",
  ]

  let easyApplyClicked = false
  for (const selector of easyApplySelectors) {
    const success = await buttonClick(selector)
    if (success) {
      easyApplyClicked = true
      console.log(`Easy Apply activado con: ${selector}`)
      break
    }
  }

  if (!easyApplyClicked) {
    console.log("No se pudo activar Easy Apply, continuando sin filtro...")
  }

  await page.waitForTimeout(2000)

  // Intentar hacer click en el filtro de tiempo con múltiples selectores
  const timeFilterSelectors = [
    'button[id="searchFilter_timePostedRange"]',
    'button[aria-label*="Fecha de publicación"]',
    'button[aria-label*="Date posted"]',
    ".search-reusables__filter-trigger-dropdown button",
  ]

  let timeFilterClicked = false
  for (const selector of timeFilterSelectors) {
    const success = await buttonClick(selector)
    if (success) {
      timeFilterClicked = true
      console.log(`Filtro de tiempo abierto con: ${selector}`)
      break
    }
  }

  if (!timeFilterClicked) {
    console.log("No se pudo abrir filtro de tiempo, continuando sin filtro...")
    return
  }

  if (periodOfTime == "Past 24 hours") {
    await page.waitForTimeout(2000)
    const success = await buttonClick('label[for="timePostedRange-r86400"]')
    if (success) {
      await page.waitForTimeout(2000)
      //await buttonClick('button[aria-label*="Aplicar el filtro actual para mostrar resultados"]')
      await clickTimeFilterApplyButton() //
    }
  } else {
    // Past week
    await page.waitForTimeout(2000)
    const success = await buttonClick('label[for="timePostedRange-r604800"]')
    if (success) {
      await page.waitForTimeout(2000)
      //await buttonClick('button[aria-label*="Aplicar el filtro actual para mostrar resultados"]')
      await clickTimeFilterApplyButton() //
    }
  }
}

// Comentamos esta función temporalmente ya que el selector está roto
// Si necesitas filtrar por tipo de trabajo, necesitaremos el HTML actual de esa sección
async function jobCriteriaByType() {
  console.log("Saltando filtro por tipo de trabajo - selector obsoleto")
  await page.waitForTimeout(2000)
}

async function checkTooManyApplications() {
  try {
    const hasTooManyApplications = await page.evaluate(() => {
      const jobDetailsWrapper = document.querySelector(".jobs-search__job-details--wrapper")

      if (!jobDetailsWrapper) {
        console.log("No se encontró la sección de detalles del trabajo")
        return false
      }

      const spans = jobDetailsWrapper.querySelectorAll(".tvm__text.tvm__text--positive")
      console.log(`Encontrados ${spans.length} spans con clase tvm__text tvm__text--positive`)

      for (const span of spans) {
        const spanText = span.textContent.toLowerCase()
        console.log(`Revisando span: "${spanText}"`)

        if (
          spanText.includes("solicitud") || //pocas solicitudes
          spanText.includes("solicitudes") || //pocas solicitudes
          spanText.includes("minutos") ||
          spanText.includes("minuto") ||
          spanText.includes("hora") ||
          spanText.includes("horas")
          // spanText.includes("1 horas") || // Agregar tiempo mas especifico
          // spanText.includes("2 horas") ||
          // spanText.includes("3 horas")
        ) {
          console.log("Trabajo con poco tiempo de creación")
          return true
        }
      }

      return false
    })

    return hasTooManyApplications
  } catch (error) {
    console.log("Error al verificar número de solicitudes:", error.message)
    return false
  }
}

async function jobsApply() {
  await buttonClick("body header nav ul li:nth-child(3) a")
  await waitForSelectorAndType('body header input[componentkey="jobSearchBox"]', keyword)
  await clearAndType('body header input[placeholder="Ciudad, provincia o código postal"]', location)
  await page.waitForTimeout(800)

  await page.keyboard.press("ArrowDown")
  await page.keyboard.press("Enter")
  await page.waitForTimeout(500)
  await page.keyboard.press("Enter")

  await jobCriteriaByTime()
  await page.waitForTimeout(3000)
  await jobCriteriaByType()
  await page.waitForTimeout(2000)

  console.log("Agregando parámetros de URL para trabajos remotos y ordenamiento...")
  const currentUrl = page.url()
  const newUrl = currentUrl + "&f_WT=2&sortBy=DD"
  await page.goto(newUrl)
  await page.waitForTimeout(3000)
  console.log("Parámetros agregados exitosamente, URL actualizada:", newUrl)

  console.log("✅ Procediendo con aplicaciones...")

  // to hide messages dialog
  await page.waitForTimeout(2000)
  await FillAndApply()
}

async function main() {
  logs()
  await initiliazer()
  await Login()
  await jobsApply()
  await browser.close()
}

main()
