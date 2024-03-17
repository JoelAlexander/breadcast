require('dotenv').config()
import inquirer from "inquirer"

inquirer.prompt([{
    name: "task",
    message: "Select a task.",
    type: "input",
    choices: [ "" ]
}], )