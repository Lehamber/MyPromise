// 把finally的功能也实现一下
const MyPromise = function () {
  const FULLFILLED = 'fullfilled';
  const REJECTED = 'rejected';
  const PENDING = 'pending';

  // 私有变量
  const PromiseStatus = Symbol('PromiseStatus');
  const ResHandlers = Symbol('ResHandlers');
  const ErrHandlers = Symbol('ErrHandlers');
  const PromiseValue = Symbol('PromiseValue');

  // 私有方法
  const resAndErr = Symbol('resAndErr');
  const exeHandler = Symbol('exeHandler');
  const thenAndCatch = Symbol('thenAndCatch');

  return class MyPromise {
    constructor(executer) {
      this[PromiseStatus] = PENDING;
      this[ResHandlers] = [];
      this[ErrHandlers] = [];

      const resolve = res => {
        this[resAndErr](res, FULLFILLED, this[ResHandlers]);
      }
      const reject = err => {
        this[resAndErr](err, REJECTED, this[ErrHandlers]);
      }
      executer(resolve, reject);
    }
    // 抽离resolve 和 reject方法中的操作
    [resAndErr](value, status, handlers) {
      if (this[PromiseStatus] !== PENDING) {
        return;
      }
      // 修改状态
      this[PromiseStatus] = status;
      this[PromiseValue] = value;
      // 执行then方法传进来的处理函数
      handlers.forEach(p => {
        // 为了模拟真实的微任务，我们这里借用Promise的resolve方法，写一个立执行的微任务
        Promise.resolve().then(() => p(value));
      })
    }

    then(resHandler, errHandler) {
      return this[thenAndCatch](resHandler, errHandler);
    }
    catch (errHandler) {
      return this[thenAndCatch](undefined, errHandler);
    }

    //抽离then 和 catch 的公共部分
    [thenAndCatch](resHandler, errHandler) {
      return new Promise((resolve, reject) => {
        if (this[PromiseStatus] !== PENDING) {
          if (this[PromiseStatus] === FULLFILLED) {
            Promise.resolve().then(() => {
              this[exeHandler](resHandler, 1, resolve, reject);
            })
          } else if (this[PromiseStatus] === REJECTED) {
            Promise.resolve().then(() => {
              this[exeHandler](errHandler, 2, resolve, reject);
            })
          }
        } else {
          this[ResHandlers].push(() => {
            this[exeHandler](resHandler, 1, resolve, reject);
          });
          this[ErrHandlers].push(() => {
            this[exeHandler](errHandler, 2, resolve, reject);
          });
        }
      });
    }

    // 抽离thenAndCatch方法中的公共部分
    // type: 1 表示成功回调， 2表示失败回调
    [exeHandler](handler, type, resolve, reject) {
      if (handler === undefined) {
        type === 1 ? resolve(this[PromiseValue]) : reject(this[PromiseValue]);
        return;
      }

      let res = handler(this[PromiseValue]);
      if (res instanceof MyPromise) {
        res.then(res => resolve(res), err => reject(err));
      } else {
        resolve(res);
      }
    } 
    
    finally(fun) {
      return new MyPromise((resolve, reject) => {
        // fun返回的不是promise，返回一个 this的镜像。
        // fun返回的是一个成功的promise，返回一个this的镜像，但要在this的状态确定后 再去返回。
        // fun返回的是一个失败的promise，但会这个失败的promise的镜像，注意也要在this的状态确定后 再去返回。

        // 当 fun 中 throw了错误时，会返回一个失败的promise，值是 throw扔出的值

        let result;
        try {
          result = fun();
        } catch (err) {
          this.then(res => reject(err), err => reject(err));
        }

        if (result instanceof MyPromise) {
          const resAnderr = (thisRes, statusHandler) => {
            result.then(res => statusHandler(thisRes), err => reject(err));
          }
          this.then(res => resAnderr(res, resolve), err => resAnderr(err, reject));
        } else {
          this.then(res => resolve(res), err => reject(res))
        }
      })
    }

    static resolve(value) {
      if (value instanceof MyPromise) {
        return value;
      } else {
        return new MyPromise((resolve, reject) => {
          resolve(value);
        })
      }
    }

    static reject(value) {
      return new MyPromise((resolve, reject) => {
        reject(value);
      })
    }

    static all(arr) {
      if (!iterObj[Symbol.iterator]) {
        throw '请传入一个可迭代对象'
      }
    
      let len = 0;
      for (let x of iterObj) {
        len++;
      }
    
      if(len === 0) {
        return [];
      }
    
      return new Promise((resolve, reject) => {
        let count = 0,
          resArr = [],
          i = 0;
        for (let x of iterObj) {
          ! function (i) {
            if (x.constructor === Promise) {
              x.then(res => {
                resArr[i] = res;
                count++;
                if (count === len) {
                  resolve(resArr);
                }
              }, err => {
                reject(err);
              })
            } else {
              Promise.resolve(x).then(res => {
                resArr[i] = res;
                count++;
                if (count === len) {
                  resolve(resArr);
                }
              })
            }
          }(i);
          i++;
        }
      })
    }

    static race(arr) {
      if(!arr[Symbol.iterator]) {
        throw '请传入一个可迭代对象'
      }
      let len = 0;
      for(let x of arr) {
        len++;
      }
      if(len === 0) {
        return new MyPromise((resolve, reject) => {});
      }

      return new MyPromise((resolve, reject) => {
        for(let x of arr) {
          if(x instanceof MyPromise) {
            x.then(res => {
              resolve(res);
            }, err => {
              reject(err);
            }) 
          } else {
            MyPromise.resolve(x).then(res => {
              resolve(res);
            })
          }
        }
      }) 
    }
  }
}();


let p = Promise.all(
  [
    new Promise((resolve, reject) => {
      setTimeout(function() {
        reject(1)
      }, 200)
    }),
    new Promise((resolve, reject) => {
      setTimeout(function() {
        reject(2)
      }, 0)
    })
  ]
);
 
setTimeout(console.log, 500, p)
p.catch(err => {
  console.log(err);
})