import {inject, Model, getModels, service, resource} from '../src'

describe('model dependency inject test', function () {
    it('test model di', () => {
        const modelName = 'test model di 1'
        const userModelName = 'test model user 2'
        @service(userModelName)
        class UserModel extends Model {
            name = 'hello';
        }
        @service(modelName)
        class TestModel extends Model {
            @inject(UserModel) user;
            getUser() {
                return this.user;
            }
            @resource(userModelName) user2;
            getUser2() {
                return this.user2;
            }
        }

        let model = <TestModel> getModels()[modelName]
        let userModel = <UserModel> getModels()[userModelName]

        expect(model.getUser()).toEqual(userModel);
        expect(model.getUser2()).toEqual(userModel);
    });
})
