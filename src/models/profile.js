class Profile {
    constructor(name, email, birthday, gender, password) {
        this.name = name;
        this.email = email;
        this.birthday = new Date(birthday).toISOString().split('T')[0];
        this.gender = gender;
        this.password = password;
    }
}

module.exports = Profile;
