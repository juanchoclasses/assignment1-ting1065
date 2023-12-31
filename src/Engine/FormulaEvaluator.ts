import Cell from "./Cell"
import SheetMemory from "./SheetMemory"
import { ErrorMessages } from "./GlobalDefinitions";



export class FormulaEvaluator {
  // Define a function called update that takes a string parameter and returns a number
  private _errorOccured: boolean = false;
  private _errorMessage: string = "";
  private _currentFormula: FormulaType = [];
  private _lastResult: number = 0;
  private _sheetMemory: SheetMemory;
  private _result: number = 0;


  constructor(memory: SheetMemory) {
    this._sheetMemory = memory;
  }

  // evaluate the formula
  evaluate(formula: FormulaType) {
    // check for empty formula
    if (formula.length === 0) {
      this._errorMessage = ErrorMessages.emptyFormula;
      return;
    } else {
      this._errorMessage = "";
    }

    // check cell references in the formula and convert them to values and put them in a new array
    const formulaInValue = [...formula];

    for (let i = 0; i < formula.length; i++) {
      const token = formula[i];
      if (this.isCellReference(token)) {
        const [value, error] = this.getCellValue(token);
        this._errorMessage = error;
        formulaInValue[i] = String(value);
      }
    }

    // convert infix to postfix
    const operatorStack: TokenType[] = [];
    const outputQueue: TokenType[] = [];
    const precedence: { [key: string]: number } = {
      "+": 1,
      "-": 1,
      "*": 2,
      "/": 2
    };

    for (const token of formulaInValue) {
      if (this.isNumber(token)) {
        outputQueue.push(token);
      } else if (token === '(') {
        operatorStack.push(token);
      } else if (token === ')') {
        if (operatorStack[operatorStack.length - 1] === '(' && outputQueue.length === 0) {
          this._errorMessage = ErrorMessages.missingParentheses;
        }
        while (operatorStack.length && operatorStack[operatorStack.length - 1] !== '(') {
          outputQueue.push(operatorStack.pop()!);
        }
        if (operatorStack.length && operatorStack[operatorStack.length - 1] === '(') {
          operatorStack.pop();
        }
      } else {
        while (
          operatorStack.length &&
          precedence[token] <= precedence[operatorStack[operatorStack.length - 1]]
        ) {
          outputQueue.push(operatorStack.pop()!);
        }
        operatorStack.push(token);
      }
    }

    while (operatorStack.length) {
      outputQueue.push(operatorStack.pop()!);
    }

    //check if the formula is one number only
    if (outputQueue.length === 1 && this.isNumber(outputQueue[0])) {
      this._result = Number(outputQueue[0]);
      return;
    }

    // evaluate the postfix expression
    const valueStack: number[] = [];
    for (const token of outputQueue) {
      let endEvaluate = false;
      if (this.isNumber(token)) {
        valueStack.push(Number(token));
      } else {
        const b = valueStack.pop();
        const a = valueStack.pop();
        if (a === undefined || b === undefined) {
          if (b !== undefined) {
            valueStack.push(b);
          } 
          this._errorMessage = ErrorMessages.invalidFormula;
          this._result = valueStack[0];
          break;
        }
        switch (token) {
          case '+':
            valueStack.push(a + b);
            break;
          case '-':
            valueStack.push(a - b);
            break;
          case '*':
            valueStack.push(a * b);
            break;
          case '/':
            if (b === 0) {
              this._errorMessage = ErrorMessages.divideByZero;
              this._result = Infinity;
              endEvaluate = true;
            } else {
              valueStack.push(a / b);
            }
            break;
          default:
            this._errorMessage = ErrorMessages.invalidOperator;
            endEvaluate = true;
        }
      }
      if (endEvaluate) {
        break;
      }
    }

    if (this._errorMessage === "") {
      this._result = valueStack[0];
    }
  }

  public get error(): string {
    return this._errorMessage
  }

  public get result(): number {
    return this._result;
  }




  /**
   * 
   * @param token 
   * @returns true if the toke can be parsed to a number
   */
  isNumber(token: TokenType): boolean {
    return !isNaN(Number(token));
  }

  /**
   * 
   * @param token
   * @returns true if the token is a cell reference
   * 
   */
  isCellReference(token: TokenType): boolean {

    return Cell.isValidCellLabel(token);
  }

  /**
   * 
   * @param token
   * @returns [value, ""] if the cell formula is not empty and has no error
   * @returns [0, error] if the cell has an error
   * @returns [0, ErrorMessages.invalidCell] if the cell formula is empty
   * 
   */
  getCellValue(token: TokenType): [number, string] {

    let cell = this._sheetMemory.getCellByLabel(token);
    let formula = cell.getFormula();
    let error = cell.getError();

    // if the cell has an error return 0
    if (error !== "" && error !== ErrorMessages.emptyFormula) {
      return [0, error];
    }

    // if the cell formula is empty return 0
    if (formula.length === 0) {
      return [0, ErrorMessages.invalidCell];
    }


    let value = cell.getValue();
    return [value, ""];

  }


}

export default FormulaEvaluator;