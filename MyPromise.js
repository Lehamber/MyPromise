const MyPromise = function () {
  const PENDING = 'pending';
  const FULFILLED = 'fulfilled';
  const REJECTED = 'rejected';

  const PromiseStatus = Symbol('PromiseStatus');
  const PromiseValue = Symbol('PromiseValue');
  const resHandlers = Symbol('resHanders');
  const errHandlers = Symbol('errHanders');

  // 内部处理方法
  const changeStatus = Symbol('handleResult');
  const linkPromise = Symbol('linkPromise');
  const settledHandler = Symbol('settledHandler');

  return class {
    /**
     * 改变状态的函数
     * @param {*} data 数据
     * @param {*} status 要改变的状态 fulfilled or rejected
     * @param {*} queue 处理队列
     * @returns 
     */
    [changeStatus](data, status, queue) {
      if (this[PromiseStatus] !== PENDING) return;
      // 改变状态
      this[PromiseStatus] = status;
      this[PromiseValue] = data;
      // 执行响应函数
      queue.forEach(p => {
        p(data);
      });
    }
    /**
     * 
     * @param {*} execute 
     */
    constructor(executor) {
      this[PromiseStatus] = PENDING;
      this[PromiseValue] = undefined;
      this[resHandlers] = [];
      this[errHandlers] = [];

      const resolve = (res) => {
        this[changeStatus](res, FULFILLED, this[resHandlers]);
      }
      const reject = (err) => {
        this[changeStatus](err, REJECTED, this[errHandlers]);
      }
      executor(resolve, reject);
    }

    /**
     * 处理resHandler 或 errHandler
     * @param {*} handler 处理函数
     * @param {*} status  对应的是那个状态
     * @param {*} queue   是Pending状态，要存入的处理队列
     */
    [settledHandler](handler, status, queue) {
      if (this[PromiseStatus] === status) {
        setTimeout(() => { // 这里使用 宏任务 去代替 微任务
          handler();
        });
      } else {
        queue.push(handler);
      }
    }
    /**
     * 处理 resHandler和errHandler，返回新生成的Promise 对象
     * 这里的的话 resHandler 和 errHandler 都要去做相应的判断，和处理，当然这两个函数最终只有一个可以处理
     * 1、判断promise的状态是否是pengding，
     *  若是pending，则将 相应的 resHandler 和 errhandler 存入 执行队列中
     *  若不是pending，则将 直接执行的 resHandler 和 errHandler
     * 2、在执行对应的 resHandler 或 errHandler 的时候，还要做一些判断
     **** 1、是否为空？ 若为空，则直接将resolve promise的值
     **** 2、若不为空 则判断对应的resHandler or errHandler 执行的结果是否为 一个Promise对象，
     *     * 1、若是promise对象，则执行这个promise的then方法，同步这个promise 和 新生成promise的状态。
     *     * 2、若不是，则将返回的值，直接 resolve
     * @param {*} resHandler  状态为 fulfiled时的 响应函数
     * @param {*} errHandler  状态为 rejected时的 响应函数
     * @returns 返回新的promise
     */
    [linkPromise](resHandler, errHandler) {
      function exec(context, hander, resolve, reject) {
        let res = hander(context[PromiseValue]);
        if (res instanceof MyPromise) {
          res.then(res => resolve(res), err => reject(err));
        } else {
          resolve(res);
        }
      }
      return new Promise((resolve, reject) => {
        // 处理 resHandler
        this[settledHandler](() => {
          if (resHandler === undefined) {
            resolve(this[PromiseValue]);
            return;
          }
          exec(this, resHandler, resolve, reject);
        }, FULFILLED, this[resHandlers]);

        // 处理errHandler
        this[settledHandler](() => {
          if (errHandler === undefined) {
            reject(this[PromiseValue]);
            return;
          }
          exec(this, errHandler, resolve, reject);
        }, REJECTED, this[errHandlers]);
      });
    }
    then(resHandler, errHandler) {
      return this[linkPromise](resHandler, errHandler);
    }
    catch (errHandler) {
      return this[linkPromise](undefined, errHandler);
    }

    /**
     * 当数组中每个promise都变为 fulfilled 的时候，resolve这些promise结果组成的数组
     * 当数组中有一个promise变为了 rejected 那么 直接reject
     * @param {*} pros: promise对象组成的数组 
     * @returns 
     */
    static all(pros) {
      let resCount = 0;
      let resArr = [];
      return new MyPromise(function (resolve, reject) {
        pros.forEach(p => {
          p.then(res => {
            resArr.push(res);
            if (++resCount === pros.length) {
              resolve(resArr);
            }
          }, err => {
            reject(err);
          });
        });
      });
    }
    static race(pros) {
      return new MyPromise((resolve, reject) => {
        pros.forEach(p => {
          p.then(res => {
            resolve(res);
          }, err => {
            reject(err);
          })
        })
      });
    }
    static resolve(data) {
      if (data instanceof MyPromise) {
        return data;
      }
      return new MyPromise(resolve => resolve(data));
    }
    static reject(data) {
      return new MyPromise((resolve, reject) => {
        reject(data);
      })
    }
  }
}();

 