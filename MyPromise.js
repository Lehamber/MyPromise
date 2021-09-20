const MyPromise = function () {

	const PENDING = 'pending';
	const FULFILLED = 'fulfilled';
	const REJECTED = 'rejected';

	const PromiseValue = Symbol('PromiseValue');
	const PromiseStatus = Symbol('PromiseStatus')

	const ResHandlers = Symbol('ResHandlers');
	const ErrHandlers = Symbol('ErrHandlers');

	//私有函数
	const resAndRej = Symbol('resAndRej');
	const thenAndCatch = Symbol('thenAndCatch');
	const handlerWrap = Symbol('handlerWrap');

	return class {
		constructor(exe) {
			this[PromiseStatus] = PENDING;
			this[ResHandlers] = [];
			this[ErrHandlers] = [];

			const resolve = (res) => {
				this[resAndRej](res, FULFILLED, this[ResHandlers]);
			}

			const reject = (err) => {
				this[resAndRej](err, REJECTED, this[ErrHandlers]);
			}
			exe(resolve, reject);
		}

		[resAndRej](value, status, handlers) {
			if (this[PromiseStatus] !== PENDING) {
				return;
			}
			this[PromiseStatus] = status;
			this[PromiseValue] = value;

			handlers.forEach(p => {
				p(value);
			})
		}

		then(resCall, rejCall) {
			return this[thenAndCatch](resCall, rejCall);
		}

		catch (rejCall) {
			return this[thenAndCatch](undefined, rejCall);
		}

		[thenAndCatch](resCall, rejCall) {
			return new MyPromise((resolve, reject) => {
				const resFun = () => {
					this[handlerWrap](resCall, resolve, resolve, reject);
				}
				const rejFun = () => {
					this[handlerWrap](rejCall, reject, resolve, reject);
				}

				if (this[PromiseStatus] === FULFILLED) {
					resFun();
				} else if (this[PromiseStatus] === REJECTED) {
					rejFun();
				} else if (this[PromiseStatus] === PENDING) {
					this[ResHandlers].push(resFun);
					this[ErrHandlers].push(rejFun);
				}
			})
		}

		[handlerWrap](call, returnFun, resolve, reject) {
			Promise.resolve().then(() => {
				if (call === undefined) {
					returnFun(this[PromiseValue]);
					return;
				}

				let res = call(this[PromiseValue]);
				if (MyPromise.prototype.isPrototypeOf(res)) {
					res.then(res => void resolve(res), err => void reject(err));
				} else {
					resolve(res);
				}
			})
		};

		finally(fun) {

			return new MyPromise((resolve, reject) => {

				const exe = (handler, thisRes) => {
					try {
						let result = fun();
						if (MyPromise.prototype.isPrototypeOf(result)) {
							result.then(() => handler(thisRes), err => reject(err));
						} else {
							handler(thisRes);
						}
					} catch (err) {
						reject(err);
					}
				}
				this.then(res => {
					exe(resolve, res);
				}, err => {
					exe(reject, err);
				})
			})
		}

		static resolve(value) {
			return new MyPromise((resolve, reject) => {
				if (value instanceof MyPromise) {
					value.then(res => {
						resolve(res);
					}, err => {
						reject(err);
					})
				} else {
					resolve(value);
				}
			})
		}

		static reject(value) {
			return new MyPromise((resolve, reject) => {
				reject(value);
			})
		}

		static all(iterObj) {
			if (iterObj[Symbol.iterator] === undefined) {
				throw '请传入一个可迭代对象';
			}
			iterObj = [...iterObj];

			return new MyPromise((resolve, reject) => {
				let count = 0;
				let resArr = [];

			// 可带爹对象为空的时候 返回结果为一个空数组的 成功状态的promise
				if(iterObj.length === 0) {
					resovle([]);
				}

				for (let i = 0; i < iterObj.length; i++) {

					! function (i) {
						if (MyPromise.prototype.isPrototypeOf(iterObj[i])) {
							iterObj[i].then(res => {
								resArr[i] = res;
								count++;
								if (count === len) {
									resolve(resArr);
								}
							}, err => {
								reject(err);
							})
						} else {
							MyPromise.resovle(iterObj[i]).then(res => {
								resArr[i] = res;
								count++;
								if (count === len) {
									return resArr;
								}
							})
						}
					}(i);
				}
			})
		}

		static race(iterObj) {
			// 可带爹对象为空的时候 返回要给pending状态的promise
			if (iterObj[Symbol.iterator] === undefined) {
				throw '请传入一个可迭代对象';
			}

			iterObj = [...iterObj];
			if(iterObj.length === 0) {
        return new MyPromise((resolve, reject) => {});
      }
			return new MyPromise((resolve, reject) => {
				for (let x of iterObj) {
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



let p1 = Promise.all([])

setTimeout(console.log, 0, p1);

// p1.then(res => {
// 	console.log('res:', res);
// }, err => {
// 	console.log('err:', err);
// })
