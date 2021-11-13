# Applications

How the applications is designed and work.

## Access applications

### The uri

- The uri follows the rest specification, and consists of the application, the resource type, the resource id and the operate method
- The resource type is determined by the api designer, and may be not correspond to a table in database

### Default application: *Names*

The *Name* application contains the resources of *User*, *Group*, *Role*, *Application*, *Resource*, the *Resource* correspond any resource inside or outside system and give them each an unique universal id

Because of every user access the application default once login, the uri to the *Names* Application can omit the application information, eg, The uri *group/{groupId}* correspond to the application *Names*

### Access control resource

The default control obeys the follow conditions

- Determine the privilege to the application, and it must be higher than the operator method
- Filter the resource(s) with the access control list with the operator method
  - The access control can vary in different type resources
  - The resource(s) in the *Names* Application by *Names* Application access control list
- If the count of resource(s) is zero, then operator is denied
- Do the operator to the resource(s)

#### The access control in the *Names* application

The access control list consists of *UserResourceAccessControl*, *GroupResourceAccessControl*, *RoleResourceAccessControl*, and the are reference to the *User*, *Group*, *Role*, and there is an map *NamesResourceMap* map different type resources to *Resource*

#### New application with access control

Now only application in same system can have access control by *Names* application, it is unreachable to list all or partial, and order or group resources with access control in remote system.

The following 2 steps describe how to add the access control list to the new local Application in development

- add an map like *NamesResourceMap* reference to *Resource* too
- the resources in application are reference to *NamesResourceMap*

#### TODO

- optimize the access control, may be the reference to the *User*, *Group*, *Role* can be substituted with more effectively way
- the more generic access control to new application

When the number of resources grows, the single one access control list can't be sufficient and the join query may become unrealized. So automatically hatch out new instance or shade the reference shared table may be an approach, omit *Resource* and its map could help this yet.
