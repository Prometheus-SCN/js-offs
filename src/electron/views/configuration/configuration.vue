<template>
  <div>
    <nav class="navbar">
      <ul class="navigation">
        <li>
          <router-link to="/bootstrap" :class="$router.currentRoute.path.startsWith('/bootstrap')  ? 'active' : ''" >
            Bootstrap
          </router-link>
        </li>
        <li>
          <router-link to="/network" :class="$router.currentRoute.path.startsWith('/network')  ? 'active' : ''" >
            Network
          </router-link>
        </li>
        <li>
          <router-link to="/storage" :class="$router.currentRoute.path.startsWith('/storage')  ? 'active' : ''" >
            Storage
          </router-link>
        </li>
      </ul>
    </nav>
    <router-view/>
  </div>
</template>
<style>
  .notifbar {
  display: grid;
  height: 15px;
  padding: 5px;
  justify-items: right;
  align-items: right;
 }
 .navbar {
  position: relative;
  display: grid;
  border-top: 2px solid #ebe3de;
  height: 40px;
  justify-items: center;
  align-items: center;
 }
ul.navigation {
  height: 100%;
  list-style-type: none;
  margin: 0;
  padding: 0;
  position: relative;
}
ul.navigation li {
  display: inline-block;
  margin: 0 5px 0 5px;
  padding:0 5px 0 5px;
  height: 100%;
}
ul.navigation li:hover a {
  border-bottom: solid 2px #fc9e56;
}
ul.navigation li a {
  display: block;
  padding-top: 7px;
  height: 34px;
}
ul.navigation li a:hover {
  //border-bottom: 2px solid #ebe3de
}
ul.navigation li a.active {
  border-bottom: solid 2px #00d1b2;
}
</style>
<script>
  export default {
  }
</script>
